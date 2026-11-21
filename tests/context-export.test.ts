import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { projectService } from "../src/features/projects/server/projects";
import { projectContext } from "../src/features/projects/server/context-export";
import type { Database } from "../src/server/database/database";
import { guidanceService } from "../src/features/guidance/server/guidance";

test("authorized project context preserves scope, history, redactions and numbered parts", async () => {
  const pg = new PGlite();
  try {
    for (const f of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort())
      await pg.exec(await readFile("migrations/" + f, "utf8"));
    const db: Database = {
      query: (q, v) => pg.query(q, v),
      transaction: (work) => pg.transaction((tx) => work(tx)),
    };
    const owner = { userId: "user_privateowner", displayName: "Owner", verifiedEmails: [] };
    const member = { userId: "user_privatemember", displayName: "Friend", verifiedEmails: [] };
    const projects = projectService(db);
    const id = await projects.create(owner, {
      name: "Música",
      description: "Explore a negative result.",
    });
    const foreign = await projects.create(owner, {
      name: "Different project",
      description: "FOREIGN-ONLY-MARKER",
    });
    const empty = await projectContext(db, owner, id);
    assert.match(empty.markdown, /No flow selected/);
    assert.doesNotMatch(empty.markdown, /FOREIGN-ONLY-MARKER|user_privateowner/);
    await assert.rejects(projectContext(db, member, id));
    await db.query(
      "INSERT INTO project_memberships(project_id,user_id,display_name,role) VALUES($1,$2,'Friend','member')",
      [id, member.userId],
    );
    await assert.rejects(projectContext(db, member, foreign));
    await guidanceService(db).select(owner, id, "venture");
    await db.query(
      "INSERT INTO project_comments(id,project_id,author_id,author_name,content) VALUES($1,$2,$3,'Former researcher','Disagreement: no evidence')",
      [randomUUID(), id, "former-private"],
    );
    await db.query(
      "INSERT INTO project_comments(id,project_id,author_id,author_name,content) VALUES($1,$2,$3,'Owner',$4)",
      [randomUUID(), id, owner.userId, "Possible equivalent: api_key=" + "x".repeat(28)],
    );
    await db.query(
      "INSERT INTO project_comments(id,project_id,author_id,author_name,content,deleted_at,deleted_by) VALUES($1,$2,$3,'Removed message author','',now(),$3)",
      [randomUUID(), id, owner.userId],
    );
    const guidance = guidanceService(db);
    await guidance.save(member, id, "audience", {
      revision: 0,
      content: "First idea",
      status: "draft",
      choice: null,
    });
    await guidance.save(owner, id, "audience", {
      revision: 1,
      content: "The test contradicted our initial idea.",
      status: "blocked",
      choice: null,
    });
    await db.query(
      "INSERT INTO project_comments(id,project_id,author_id,author_name,content) VALUES($1,$2,$3,'Owner','https://example.invalid/invitations/accept#private-fragment')",
      [randomUUID(), id, owner.userId],
    );
    const broken: Database = {
      ...db,
      transaction: (work) =>
        db.transaction((tx) =>
          work({
            query(sql, values) {
              if (sql.includes("FROM answer_revisions WHERE"))
                throw new Error("simulated retrieval failure");
              return tx.query(sql, values);
            },
          }),
        ),
    };
    await assert.rejects(projectContext(broken, member, id), /simulated retrieval failure/);
    const limited = await projectContext(db, member, id, 1, "discussion");
    assert.ok(limited.omissions.includes("Discussion omitted by request"));
    assert.doesNotMatch(limited.markdown, /Disagreement: no evidence|Removed message author/);
    await db.query(
      "INSERT INTO project_comments(id,project_id,author_id,author_name,content) SELECT gen_random_uuid(),$1,$2,'Owner','Row '||n||' Ω '||repeat('a',950) FROM generate_series(1,640) n",
      [id, owner.userId],
    );
    const first = await projectContext(db, member, id);
    assert.equal(first.sections.find((s) => s.title === "Discussion")?.count, 643);
    assert.ok(first.parts > 2);
    assert.ok(first.omissions.length > 0);
    const parts = [first.markdown];
    for (let n = 2; n <= first.parts; n++) {
      const p = await projectContext(db, member, id, n);
      assert.equal(p.revision, first.revision);
      parts.push(p.markdown);
    }
    const all = parts.join("\n");
    assert.match(all, /example guidance/);
    assert.match(all, /Not answered/);
    assert.match(all, /First idea/);
    assert.match(all, /The test contradicted our initial idea/);
    assert.match(all, /status: blocked/);
    assert.match(all, /Disagreement: no evidence/);
    assert.equal([...all.matchAll(/Row \d+ Ω/g)].length, 640);
    assert.doesNotMatch(
      all,
      /user_privatemember|user_privateowner|FOREIGN-ONLY-MARKER|Removed message author|private-fragment|x{28}/,
    );
    await assert.rejects(projectContext(db, member, id, first.parts + 1));
    await db.query("UPDATE projects SET description='Updated private description' WHERE id=$1", [
      id,
    ]);
    assert.notEqual((await projectContext(db, member, id)).revision, first.revision);
    let transactions = 0;
    const revokeBeforeDelivery: Database = {
      ...db,
      async transaction(work) {
        if (++transactions === 2)
          await db.query("DELETE FROM project_memberships WHERE project_id=$1 AND user_id=$2", [
            id,
            member.userId,
          ]);
        return db.transaction(work);
      },
    };
    await assert.rejects(projectContext(revokeBeforeDelivery, member, id), /access/);
  } finally {
    await pg.close();
  }
});
