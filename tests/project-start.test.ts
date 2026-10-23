import { z } from "zod";
import { queryRows, required } from "../src/server/database/query";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import type { Database } from "../src/server/database/database";
import { startProject } from "../src/features/projects/server/project-start";
import { projectService } from "../src/features/projects/server/projects";
import { guidanceService } from "../src/features/guidance/server/guidance";
import { flows } from "../src/features/guidance/model/flows";
const sql = new PGlite(),
  db: Database = {
    query: (q, v) => sql.query(q, v),
    transaction: (work) => sql.transaction((tx) => work(tx)),
  };
const owner = { userId: "setup-owner", displayName: "Owner", verifiedEmails: [] },
  outsider = { userId: "setup-outsider", verifiedEmails: [] };
before(async () => {
  for (const file of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort())
    await sql.exec(await readFile("migrations/" + file, "utf8"));
});
after(async () => {
  await sql.close();
});
test("guided setup atomically starts every project type with capture answers and owner-scoped access", async () => {
  for (const flow of Object.values(flows)) {
    const id = await startProject(db, owner, {
      name: "Setup " + flow.id,
      description: "Typed in the setup process.",
      flow: flow.id,
    });
    const state = await guidanceService(db).get(owner, id);
    assert.equal(required(state?.flow).id, flow.id);
    assert.equal(
      required(state?.answers).find(
        (a) => a.node_id === required(required(flow.stages[0]).nodes[0]).id,
      )?.content,
      "Setup " + flow.id,
    );
    assert.equal(
      required(state?.answers).find(
        (a) => a.node_id === required(required(flow.stages[0]).nodes[1]).id,
      )?.content,
      "Typed in the setup process.",
    );
    await assert.rejects(guidanceService(db).get(outsider, id));
  }
});
test("deferred type remains supported, and invalid/failed setup leaves no partial projects or memberships", async () => {
  const id = await startProject(db, owner, {
    name: "Choose later",
    description: "A project without a flow.",
    flow: "",
  });
  assert.equal(await guidanceService(db).get(owner, id), null);
  const before = (await projectService(db).list(owner)).length;
  await assert.rejects(
    startProject(db, owner, {
      name: "Invalid",
      description: "Invalid workflow.",
      flow: "forged-flow",
    }),
  );
  assert.equal((await projectService(db).list(owner)).length, before);
  const broken: Database = {
    query: db.query,
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          query: async (q, v) => {
            if (q.includes("INSERT INTO node_answers"))
              throw new Error("Synthetic initialization failure");
            return tx.query(q, v);
          },
        }),
      ),
  };
  await assert.rejects(
    startProject(broken, owner, {
      name: "Rolled back",
      description: "No partial capture.",
      flow: "creative",
    }),
  );
  assert.equal((await projectService(db).list(owner)).length, before);
  assert.equal(
    required(
      (
        await queryRows(
          db,
          z.object({ count: z.number().int() }),
          "SELECT count(*)::int AS count FROM projects WHERE name='Rolled back'",
        )
      )[0],
    ).count,
    0,
  );
});
