import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Database, Queryable } from "../src/server/database/database";
import { projectService } from "../src/features/projects/server/projects";
import { guidanceService } from "../src/features/guidance/server/guidance";
import { notificationService } from "../src/features/notifications/server/notifications";
import { collaborationService } from "../src/features/collaboration/server/collaboration";
import { artifactService } from "../src/features/artifacts/server/artifacts";
import { taskService } from "../src/features/tasks/server/tasks";

// Corrupt driver results after real SQL execution; each service must reject them.
function corrupt(db: Database, fragment: string, field: string, value: unknown): Database {
  const wrap = (tx: Queryable): Queryable => ({
    async query(sql, values) {
      const result = await tx.query(sql, values);
      return sql.includes(fragment)
        ? { rows: result.rows.map((row) => ({ ...(row as object), [field]: value })) }
        : result;
    },
  });
  return { ...wrap(db), transaction: (work) => db.transaction((tx) => work(wrap(tx))) };
}
const decodedError = (error: unknown) => {
  assert.ok(error instanceof Error);
  assert.equal(error.message, "Database result does not match its declared schema.");
  return true;
};

test("services reject malformed notification, invitation, flow, revision, comment and file results", async () => {
  const sql = new PGlite();
  try {
    for (const file of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort())
      await sql.exec(await readFile(`migrations/${file}`, "utf8"));
    const db: Database = {
      query: (q, v) => sql.query(q, v),
      transaction: (work) => sql.transaction((tx) => work(tx)),
    };
    const owner = { userId: "decoder-owner", verifiedEmails: ["owner@example.invalid"] };
    const friend = { userId: "decoder-friend", verifiedEmails: ["friend@example.invalid"] };
    const projectId = await projectService(db).create(owner, {
      name: "Decoder fixture",
      description: "Synthetic only",
    });
    const invitation = await projectService(db).invite(owner, projectId, friend.verifiedEmails[0]);
    await assert.rejects(
      projectService(corrupt(db, "AS expired", "expired", "false")).accept(
        friend,
        invitation.token,
      ),
      decodedError,
    );
    assert.equal((await projectService(db).people(owner, projectId)).members.length, 1);
    await projectService(db).accept(friend, invitation.token);
    await guidanceService(db).select(owner, projectId, "creative");
    await taskService(db).change(owner, projectId, 0, {
      kind: "add",
      title: "Synthetic task",
      parentId: null,
    });
    const commentId = await collaborationService(db).post(
      friend,
      projectId,
      {},
      "PRIVATE SYNTHETIC BODY",
    );
    const artifactId = await artifactService(db).create(owner, projectId, {
      name: "Markdown",
      kind: "markdown",
    });
    await artifactService(db).upload(owner, projectId, artifactId, 1, {
      name: "plan.md",
      data: Buffer.from("# Synthetic"),
    });

    await assert.rejects(
      notificationService(corrupt(db, "SELECT count(*)", "count", "1")).unread(owner),
      decodedError,
    );
    await assert.rejects(
      notificationService(
        corrupt(db, "SELECT c.id,c.project_id", "created_at", "2026-10-23"),
      ).unread(owner),
      decodedError,
    );
    await assert.rejects(
      notificationService(corrupt(db, "SELECT c.id,c.project_id", "cursor_time", "invalid")).unread(
        owner,
      ),
      decodedError,
    );
    await assert.rejects(
      guidanceService(corrupt(db, "SELECT * FROM project_flows", "flow_id", "unknown")).get(
        owner,
        projectId,
      ),
      decodedError,
    );
    await assert.rejects(
      taskService(corrupt(db, "SELECT revision FROM project_task_lists", "revision", -1)).list(
        owner,
        projectId,
      ),
      decodedError,
    );
    await assert.rejects(
      artifactService(
        corrupt(db, "SELECT data FROM artifact_files", "data", "PRIVATE INVALID BYTES"),
      ).get(owner, projectId, artifactId),
      decodedError,
    );
    await assert.rejects(
      collaborationService(corrupt(db, "SELECT author_id,stage_id", "revision", "1")).change(
        friend,
        projectId,
        commentId,
        1,
        "edit",
        "Must roll back",
      ),
      decodedError,
    );
    assert.equal(
      (await collaborationService(db).comments(owner, projectId, {})).items[0]?.content,
      "PRIVATE SYNTHETIC BODY",
    );
    assert.equal((await notificationService(db).unread(owner)).items.length, 1);
  } finally {
    await sql.close();
  }
});
