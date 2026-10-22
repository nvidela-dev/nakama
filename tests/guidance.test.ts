import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Database } from "../src/lib/database";
import { projectService, type Actor } from "../src/lib/projects";
import { guidanceService, ConflictError } from "../src/lib/guidance";
import { flows } from "../src/lib/flows";
const sql = new PGlite();
const db: Database = {
  query: (q, v) => sql.query(q, v),
  transaction: (work) => sql.transaction((tx) => work(tx)),
};
const projects = projectService(db),
  guidance = guidanceService(db);
const alice: Actor = {
  userId: "alice",
  verifiedEmails: ["alice@example.com"],
  displayName: "Alice",
};
const bob: Actor = {
  userId: "bob",
  verifiedEmails: ["bob@example.com"],
  displayName: "Bob",
};
const outsider: Actor = { userId: "other", verifiedEmails: [] };
const answer = (content: string, revision = 0) => ({
  content,
  revision,
  status: "answered",
  choice: null,
});
before(async () => {
  for (const file of ["001_private_projects.sql", "002_guided_flows.sql", "003_comments_activity.sql"])
    await sql.exec(await readFile(`migrations/${file}`, "utf8"));
});
after(async () => {
  await sql.close();
});
async function project(flow = "venture") {
  const id = await projects.create(alice, {
    name: "Little idea",
    description: "A little idea with friends.",
  });
  await guidance.select(alice, id, flow);
  return id;
}

test("templates preserve five stages, valid within-stage edges, guidance, and creative freedom", () => {
  assert.deepEqual(
    flows.venture.stages.map((s) => s.name),
    ["Idea", "Exploration", "Validation", "Planning", "Building"],
  );
  assert.deepEqual(
    flows.creative.stages.map((s) => s.name),
    ["Concept", "Imagine", "Experiment", "Shape", "Create"],
  );
  for (const flow of Object.values(flows)) {
    const ids = new Set<string>();
    for (const stage of flow.stages) {
      const seen = new Set<string>();
      for (const node of stage.nodes) {
        assert.ok(!ids.has(node.id));
        ids.add(node.id);
        assert.ok(node.question && node.example);
        for (const parent of node.after)
          assert.ok(
            seen.has(parent),
            `${node.id} has invalid or cyclic parent ${parent}`,
          );
        seen.add(node.id);
      }
    }
  }
  assert.ok(
    !flows.creative.stages
      .flatMap((s) => s.nodes)
      .some((n) => /market|profit|demand/i.test(n.question)),
  );
});

test("flow selection preserves capture attribution and cannot replace existing answers", async () => {
  const id = await project("creative");
  let state = await guidance.get(alice, id);
  assert.equal(state?.answers.length, 2);
  assert.equal(
    state?.answers.find((a) => a.node_id === "spark-name")?.content,
    "Little idea",
  );
  const capture = await guidance.history(alice, id, "spark-name");
  assert.equal(capture[0].origin, "capture");
  assert.equal(capture[0].author_id, "alice");
  await guidance.select(alice, id, "creative");
  await assert.rejects(guidance.select(alice, id, "venture"));
  await assert.rejects(guidance.select(outsider, id, "creative"));
  await assert.rejects(guidance.get(outsider, id));
  await assert.rejects(guidance.history(outsider, id, "spark-name"));
  await guidance.save(alice, id, "spark-name", answer("A better name", 1));
  assert.equal((await projects.get(alice, id)).name, "A better name");
  state = await guidance.get(alice, id);
  assert.equal(state?.answers.length, 2);
});

test("two members cannot silently overwrite an answer, and conflicts expose only authorized current content", async () => {
  const id = await project();
  const invite = await projects.invite(alice, id, "bob@example.com");
  await projects.accept(bob, invite.token);
  await guidance.save(alice, id, "audience", answer("Neighbors"));
  await guidance.save(bob, id, "audience", answer("Apartment neighbors", 1));
  await assert.rejects(
    guidance.save(alice, id, "audience", answer("Stale edit", 1)),
    (error) =>
      error instanceof ConflictError &&
      error.current.content === "Apartment neighbors",
  );
  assert.equal((await guidance.history(alice, id, "audience")).length, 2);
  await assert.rejects(
    guidance.save(outsider, id, "audience", answer("Not allowed", 1)),
    (error) => !(error instanceof ConflictError),
  );
  await guidance.save(
    alice,
    id,
    "audience",
    answer("Combined understanding", 2),
  );
  const history = await guidance.history(alice, id, "audience");
  assert.deepEqual(
    history.map((r) => r.author_id),
    ["alice", "bob", "alice"],
  );
  await projects.remove(alice, id, "bob");
  await assert.rejects(
    guidance.save(bob, id, "audience", answer("Removed", 3)),
  );
});

test("upstream edits flag dependent conclusions without erasing content and reject stale reviews", async () => {
  const id = await project();
  await guidance.save(
    alice,
    id,
    "problem",
    answer("Buying a tool for one job"),
  );
  await guidance.save(alice, id, "affordability", answer("Two evenings"));
  let state = (await guidance.get(alice, id))!;
  await guidance.reviewStage(
    alice,
    id,
    "exploration",
    "Some questions remain; test the idea.",
    state.contentRevision,
  );
  await guidance.save(alice, id, "audience", answer("People in our building"));
  state = (await guidance.get(alice, id))!;
  assert.equal(
    state.answers.find((a) => a.node_id === "problem")?.needs_review,
    true,
  );
  assert.equal(
    state.answers.find((a) => a.node_id === "problem")?.content,
    "Buying a tool for one job",
  );
  assert.equal(
    state.answers.find((a) => a.node_id === "affordability")?.needs_review,
    true,
  );
  assert.equal(state.reviews[0].reviewed, false);
  await assert.rejects(
    guidance.reviewStage(
      alice,
      id,
      "exploration",
      "Old review",
      state.contentRevision - 1,
    ),
  );
  await guidance.reviewStage(
    alice,
    id,
    "exploration",
    "Reviewed the changed audience.",
    state.contentRevision,
  );
  assert.equal(
    (
      await sql.query(
        "SELECT id FROM stage_review_history WHERE project_id=$1",
        [id],
      )
    ).rows.length,
    2,
  );
});

test("unknowns, blocked/skipped reasons, negative findings, and parking remain distinct", async () => {
  const id = await project();
  await assert.rejects(guidance.save(alice, id, "problem", answer("")));
  await assert.rejects(
    guidance.save(alice, id, "problem", { ...answer(""), status: "blocked" }),
  );
  await guidance.save(
    alice,
    id,
    "problem",
    answer("We do not know yet; ask a neighbor."),
  );
  await guidance.save(
    alice,
    id,
    "learnings",
    answer("The test did not support our idea."),
  );
  await guidance.save(alice, id, "cheap-test", {
    ...answer("Need a friend to help"),
    status: "blocked",
  });
  await guidance.save(alice, id, "affordability", {
    ...answer("Revisit after our holidays"),
    status: "skipped",
  });
  await assert.rejects(
    guidance.save(alice, id, "venture-direction", {
      ...answer("Take a break"),
      choice: "Invalid",
    }),
  );
  await guidance.save(alice, id, "venture-direction", {
    ...answer("The timing is not right"),
    choice: "Park",
  });
  assert.equal((await guidance.get(alice, id))?.projectState, "parked");
  await guidance.save(alice, id, "venture-direction", {
    ...answer("Try a smaller idea", 1),
    choice: "Revise",
  });
  assert.equal((await guidance.get(alice, id))?.projectState, "active");
  assert.equal(
    (await guidance.history(alice, id, "venture-direction")).length,
    2,
  );
  await assert.rejects(
    guidance.save(alice, id, "spark-name", answer("Wrong flow")),
  );
  await assert.rejects(
    guidance.save(alice, id, "idea-name", answer("a".repeat(101), 1)),
  );
});

test("creative decisions can save for later, resume, and finish without commercial questions", async () => {
  const id = await project("creative");
  await guidance.save(alice, id, "experiment-direction", {
    ...answer("Rest for now"),
    choice: "Save for later",
  });
  assert.equal((await guidance.get(alice, id))?.projectState, "parked");
  await guidance.save(alice, id, "experiment-direction", {
    ...answer("Ready to play again", 1),
    choice: "Keep direction",
  });
  await guidance.save(alice, id, "create-loop", {
    ...answer("We love our small episode"),
    choice: "Finished enough",
  });
  assert.equal(
    (await guidance.get(alice, id))?.projectState,
    "finished_enough",
  );
  await guidance.save(alice, id, "sharing", {
    ...answer("This is just for us"),
    choice: "Keep among friends",
  });
  assert.equal(
    (await guidance.get(alice, id))?.projectState,
    "finished_enough",
  );
});

test("card timelines expose only member status metadata and preserve honest question progress", async () => {
  const { projectProgress } = await import("../src/lib/project-progress");
  const id = await project("creative");
  const summaries = await projectProgress(db, alice);
  const stages = summaries.get(id)!;
  assert.equal(stages.length, 5);
  assert.equal(stages[0].answered, 2);
  assert.equal(stages[0].total, 2);
  assert.equal(stages[0].reviewed, false);
  assert.equal(stages[1].started, false);
  await guidance.save(alice, id, "inspiration", { ...answer("Unsure"), status: "blocked" });
  const updated = (await projectProgress(db, alice)).get(id)!;
  assert.equal(updated[1].blocked, 1);
  assert.equal(updated[1].answered, 0);
  assert.equal(updated[1].started, true);
  assert.equal((await projectProgress(db, outsider)).has(id), false);
  assert.equal((await projectProgress(db, bob)).has(id), false);
  await assert.rejects(projectProgress(db, { userId: "", verifiedEmails: [] }));
  assert.ok(!JSON.stringify(updated).includes("Unsure"));
});

test("owner project edits are atomic, revision checked, and retain answer history", async () => {
  const id = await project();
  const original = await projects.get(alice, id);
  const before = (await guidance.get(alice, id))!;
  assert.equal((await projects.list(alice)).find((p) => p.id === id)?.content_revision, before.contentRevision);
  const expected = { name: original.name, description: original.description, contentRevision: before.contentRevision };
  const input = { name: "Updated project", description: "Updated purpose." };
  await assert.rejects(guidance.editProject(outsider, id, input, expected));
  const invite = await projects.invite(alice, id, bob.verifiedEmails[0]);
  await projects.accept(bob, invite.token);
  await assert.rejects(guidance.editProject(bob, id, input, expected));
  await guidance.editProject(alice, id, input, expected);
  assert.equal((await projects.get(alice, id)).name, input.name);
  const after = (await guidance.get(alice, id))!;
  assert.equal((await projects.list(alice)).find((p) => p.id === id)?.content_revision, after.contentRevision);
  assert.equal(after.answers.find((a) => a.node_id === "idea-name")?.content, input.name);
  assert.equal(after.answers.find((a) => a.node_id === "idea-description")?.content, input.description);
  assert.equal((await guidance.history(alice, id, "idea-name")).length, 2);
  assert.equal((await guidance.history(alice, id, "idea-description")).length, 2);
  await assert.rejects(guidance.editProject(alice, id, { ...input, name: "Stale overwrite" }, expected));
  assert.equal((await projects.get(alice, id)).name, input.name);
  const fresh = { ...input, contentRevision: after.contentRevision };
  const failing: Database = {
    query: db.query,
    transaction: (work) => db.transaction((tx) => work({ query: (q, values) => {
      if (q.startsWith("INSERT INTO answer_revisions") && values?.[1] === "idea-description") throw new Error("simulated history failure");
      return tx.query(q, values);
    } })),
  };
  await assert.rejects(guidanceService(failing).editProject(alice, id, { name: "Must roll back", description: "Must also roll back" }, fresh));
  assert.equal((await projects.get(alice, id)).name, input.name);
  assert.equal((await guidance.history(alice, id, "idea-name")).length, 2);
  const bare = await projects.create(alice, { name: "Before flow", description: "No flow yet." });
  await guidance.editProject(alice, bare, input, { name: "Before flow", description: "No flow yet.", contentRevision: 0 });
  assert.equal((await projects.get(alice, bare)).name, input.name);
});

test("owner deletion confirms the name and removes only the selected project atomically", async () => {
  const id = await project();
  const other = await project("creative");
  const invite = await projects.invite(alice, id, bob.verifiedEmails[0]);
  await projects.accept(bob, invite.token);
  const current = (await guidance.get(alice, id))!;
  await guidance.reviewStage(alice, id, "idea", "Capture reviewed.", current.contentRevision);
  await assert.rejects(projects.deleteProject(bob, id, "Little idea"));
  await assert.rejects(projects.deleteProject(outsider, id, "Little idea"));
  await assert.rejects(projects.deleteProject(alice, id, "wrong name"));
  const failing: Database = {
    query: db.query,
    transaction: (work) => db.transaction((tx) => work({ query: (q, values) => {
      if (q.startsWith("DELETE FROM project_flows")) throw new Error("simulated delete failure");
      return tx.query(q, values);
    } })),
  };
  await assert.rejects(projectService(failing).deleteProject(alice, id, "Little idea"));
  assert.equal((await guidance.history(alice, id, "idea-name")).length, 1);
  await projects.deleteProject(alice, id, "Little idea");
  for (const table of ["projects", "project_memberships", "project_invitations", "project_flows", "node_answers", "answer_revisions", "stage_reviews", "stage_review_history"]) {
    const column = table === "projects" ? "id" : "project_id";
    assert.equal((await db.query(`SELECT * FROM ${table} WHERE ${column} = $1`, [id])).rows.length, 0);
  }
  await assert.rejects(projects.get(alice, id));
  await assert.rejects(guidance.get(bob, id));
  await assert.rejects(projects.accept(bob, invite.token));
  assert.ok(!(await projects.list(alice)).some((p) => p.id === id));
  assert.ok(await guidance.get(alice, other));
});
