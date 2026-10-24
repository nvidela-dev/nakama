import { referenceService } from "../src/features/collaboration/server/references";
import { artifactService } from "../src/features/artifacts/server/artifacts";
import { required } from "../src/server/database/query";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Database } from "../src/server/database/database";
import { projectService } from "../src/features/projects/server/projects";
import { guidanceService } from "../src/features/guidance/server/guidance";
import { collaborationService } from "../src/features/collaboration/server/collaboration";
const sql = new PGlite();
const db: Database = {
  query: (q, v) => sql.query(q, v),
  transaction: (work) => sql.transaction((tx) => work(tx)),
};
const projects = projectService(db),
  guidance = guidanceService(db),
  collaboration = collaborationService(db);
const owner = { userId: "owner", displayName: "Owner", verifiedEmails: ["owner@example.com"] };
const member = { userId: "member", displayName: "Friend", verifiedEmails: ["friend@example.com"] };
const outsider = { userId: "outsider", verifiedEmails: [] };
before(async () => {
  for (const file of (await readdir("migrations")).filter((name) => name.endsWith(".sql")).sort())
    await sql.exec(await readFile(`migrations/${file}`, "utf8"));
});
after(async () => {
  await sql.close();
});
async function fixture() {
  const id = await projects.create(owner, {
    name: "Discussion test",
    description: "Synthetic collaboration fixture.",
  });
  await guidance.select(owner, id, "creative");
  const invite = await projects.invite(owner, id, member.verifiedEmails[0]);
  await projects.accept(member, invite.token);
  return { id, invite };
}
test("comments isolate project/stage/node scopes and reject foreign resources and non-members", async () => {
  const { id } = await fixture();
  const other = await projects.create(owner, { name: "Other", description: "Unrelated." });
  const root = await collaboration.post(owner, id, {}, "Project discussion");
  await collaboration.post(member, id, { stageId: "imagine" }, "Stage discussion");
  await collaboration.post(
    member,
    id,
    { stageId: "imagine", nodeId: "inspiration" },
    "Node discussion",
  );
  const tasksComment = await collaboration.post(
    owner,
    id,
    { stageId: "tasks" },
    "Tasks discussion",
  );
  const artifactsComment = await collaboration.post(
    member,
    id,
    { stageId: "artifacts" },
    "Artifacts discussion",
  );
  assert.deepEqual(
    (await collaboration.comments(member, id, {})).items.map((c) => c.id),
    [root],
  );
  assert.deepEqual(
    (await collaboration.comments(member, id, { stageId: "tasks" })).items.map((c) => c.id),
    [tasksComment],
  );
  assert.deepEqual(
    (await collaboration.comments(owner, id, { stageId: "artifacts" })).items.map((c) => c.id),
    [artifactsComment],
  );
  assert.equal(
    required((await collaboration.comments(member, id, { stageId: "tasks" })).items[0]).content,
    "Tasks discussion",
  );
  assert.equal(
    required((await collaboration.comments(owner, id, { stageId: "artifacts" })).items[0]).content,
    "Artifacts discussion",
  );
  assert.equal(
    required((await collaboration.comments(owner, id, { stageId: "imagine" })).items[0]).content,
    "Stage discussion",
  );
  assert.equal(
    required(
      (await collaboration.comments(owner, id, { stageId: "imagine", nodeId: "inspiration" }))
        .items[0],
    ).content,
    "Node discussion",
  );
  assert.equal((await collaboration.comments(owner, other, {})).items.length, 0);
  await assert.rejects(
    collaboration.post(
      owner,
      id,
      { stageId: "tasks", nodeId: "inspiration" },
      "Invalid node on tasks",
    ),
  );
  await assert.rejects(collaboration.post(owner, id, { stageId: "validation" }, "Wrong flow"));
  await assert.rejects(
    collaboration.post(owner, id, { stageId: "imagine", nodeId: "rough-version" }, "Wrong stage"),
  );
  // @ts-expect-error Exercise a forged request that lacks its required stage.
  await assert.rejects(collaboration.post(owner, id, { nodeId: "inspiration" }, "Missing stage"));
  await assert.rejects(collaboration.post(owner, id, {}, "   "));
  await assert.rejects(collaboration.change(owner, other, root, 1, "edit", "Cross project"));
  await assert.rejects(collaboration.comments(outsider, id, {}));
  await assert.rejects(collaboration.activity(outsider, id));
  await assert.rejects(collaboration.post(outsider, id, {}, "No access"));
});
test("only authors edit; authors/owners remove with revision checks and body-free tombstones", async () => {
  const { id } = await fixture();
  const comment = await collaboration.post(member, id, {}, "Original body");
  await assert.rejects(collaboration.change(owner, id, comment, 1, "edit", "Owner overwrite"));
  await collaboration.change(member, id, comment, 1, "edit", "Updated body");
  await assert.rejects(collaboration.change(member, id, comment, 1, "edit", "Stale edit"));
  assert.equal(
    required((await collaboration.comments(owner, id, {})).items[0]).content,
    "Updated body",
  );
  await collaboration.change(owner, id, comment, 2, "delete");
  const tombstone = (await collaboration.comments(owner, id, {})).items[0];
  assert.equal(required(tombstone).content, "");
  assert.ok(required(tombstone).deleted_at);
  await assert.rejects(collaboration.change(member, id, comment, 3, "edit", "Resurrection"));
  const feed = await collaboration.activity(owner, id);
  assert.ok(feed.items.some((e) => e.kind === "comment_moderated" && e.actor_id === owner.userId));
  assert.ok(!JSON.stringify(feed).includes("Updated body"));
  assert.ok(!JSON.stringify(feed).includes("Original body"));
});
test("removed-member attribution survives while read/write access is revoked", async () => {
  const { id } = await fixture();
  const comment = await collaboration.post(member, id, {}, "A friend's contribution.");
  await projects.remove(owner, id, member.userId);
  const item = (await collaboration.comments(owner, id, {})).items[0];
  assert.equal(required(item).author_name, "Friend");
  assert.equal(required(item).former_member, true);
  await assert.rejects(collaboration.comments(member, id, {}));
  await assert.rejects(collaboration.activity(member, id));
  await assert.rejects(collaboration.change(member, id, comment, 1, "delete"));
});
test("activity combines recorded revisions, reviews, and safe membership events without invitation secrets", async () => {
  const { id, invite } = await fixture();
  await guidance.save(member, id, "inspiration", {
    revision: 0,
    content: "Synthetic answer",
    status: "draft",
    choice: null,
  });
  const state = (await guidance.get(owner, id))!;
  await guidance.reviewStage(owner, id, "spark", "Reviewed capture.", state.contentRevision);
  const feed = await collaboration.activity(owner, id);
  for (const kind of [
    "project_created",
    "flow_selected",
    "invitation_created",
    "member_joined",
    "answer_captured",
    "answer_saved",
    "stage_reviewed",
  ])
    assert.ok(
      feed.items.some((e) => e.kind === kind),
      kind,
    );
  assert.ok(feed.items.some((e) => e.kind === "answer_saved" && e.detail === "draft"));
  assert.ok(!JSON.stringify(feed).includes(invite.token));
  assert.ok(!JSON.stringify(feed).includes(required(member.verifiedEmails[0])));
});
test("cursor pagination preserves microseconds and covers all records exactly once", async () => {
  const { id } = await fixture();
  for (let i = 0; i < 29; i++) await collaboration.post(owner, id, {}, `Comment ${i}`);
  // All rows carry sub-millisecond precision that a JavaScript Date would lose.
  await db.query(
    "UPDATE project_comments SET created_at='2026-10-22T12:00:00.123000Z'::timestamptz + revision * interval '1 microsecond' WHERE project_id=$1",
    [id],
  );
  const first = await collaboration.comments(owner, id, {});
  assert.equal(first.items.length, 25);
  assert.ok(first.next);
  const second = await collaboration.comments(owner, id, {}, first.next);
  assert.equal(second.items.length, 4);
  assert.equal(new Set([...first.items, ...second.items].map((c) => c.id)).size, 29);
  const seen = new Set<string>();
  let next: string | undefined;
  do {
    const result = await collaboration.activity(owner, id, next);
    for (const e of result.items) {
      assert.ok(!seen.has(e.sort_key));
      seen.add(e.sort_key);
    }
    next = result.next;
  } while (next);
  assert.equal(seen.size, 35);
  await assert.rejects(collaboration.comments(owner, id, {}, "bad-cursor"));
});
test("failed event recording rolls back the comment, and whole-project deletion removes both stores", async () => {
  const { id } = await fixture();
  const failing: Database = {
    query: db.query,
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          query: (q, v) => {
            if (q.startsWith("INSERT INTO project_activity"))
              throw Error("simulated activity failure");
            return tx.query(q, v);
          },
        }),
      ),
  };
  await assert.rejects(collaborationService(failing).post(owner, id, {}, "Must roll back"));
  assert.equal((await collaboration.comments(owner, id, {})).items.length, 0);
  await collaboration.post(owner, id, {}, "Project comment");
  await collaboration.post(
    owner,
    id,
    { stageId: "imagine", nodeId: "inspiration" },
    "Scoped comment",
  );
  await projects.deleteProject(owner, id, "Discussion test");
  assert.equal(
    (await db.query("SELECT id FROM project_comments WHERE project_id=$1", [id])).rows.length,
    0,
  );
  assert.equal(
    (await db.query("SELECT id FROM project_activity WHERE project_id=$1", [id])).rows.length,
    0,
  );
});

test("reference search returns only authorized metadata, handles search and immediately rejects removed source membership", async () => {
  const source = await projects.create(owner, {
    name: "Reference source",
    description: "Synthetic",
  });
  const destination = await projects.create(owner, {
    name: "Reference destination",
    description: "Synthetic",
  });
  const hidden = await projects.create(outsider, {
    name: "Reference private",
    description: "Synthetic",
  });
  const output = await artifactService(db).create(owner, destination, {
    name: "Reference design",
    kind: "image",
  });
  await artifactService(db).create(outsider, hidden, {
    name: "Reference hidden artifact",
    kind: "markdown",
  });
  const references = referenceService(db);
  const visible = await references.search(owner, source, "reference");
  assert.ok(visible.items.some((item) => item.id === destination));
  assert.ok(visible.items.some((item) => item.id === output && item.kind === "artifact"));
  assert.ok(visible.items.every((item) => item.projectId !== hidden));
  assert.ok(
    visible.items.every(
      (item) => Object.keys(item).sort().join(",") === "id,kind,name,projectId,projectName",
    ),
  );
  assert.deepEqual(
    (await references.search(owner, source, "REFERENCE DESIGN")).items.map((item) => item.id),
    [output],
  );
  assert.deepEqual((await references.search(owner, source, "%_")).items, []);
  await assert.rejects(references.search(outsider, source, ""));
  await assert.rejects(references.search(owner, source, "x".repeat(101)));
  for (let i = 0; i < 42; i++)
    await artifactService(db).create(owner, destination, {
      name: `Catalog fixture ${i}`,
      kind: "markdown",
    });
  const bounded = await references.search(owner, source, "Catalog fixture");
  assert.equal(bounded.items.length, 40);
  assert.equal(bounded.hasMore, true);
  assert.deepEqual(
    (await references.search(owner, source, "Catalog fixture")).items.map((item) => item.id),
    bounded.items.map((item) => item.id),
  );
  await db.query("DELETE FROM project_memberships WHERE project_id=$1 AND user_id=$2", [
    destination,
    owner.userId,
  ]);
  assert.ok(
    (await references.search(owner, source, "reference")).items.every(
      (item) => item.projectId !== destination,
    ),
  );
  await db.query("DELETE FROM project_memberships WHERE project_id=$1 AND user_id=$2", [
    source,
    owner.userId,
  ]);
  await assert.rejects(references.search(owner, source, ""));
});
