import { randomUUID } from "node:crypto";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { projectService } from "../src/features/projects/server/projects";
import { type Actor } from "@/shared/contracts/actor";
import { experimentService } from "../src/features/experiments/server/experiments";
import type { Database } from "../src/server/database/database";
import { taskService } from "../src/features/tasks/server/tasks";
import { guidanceService } from "../src/features/guidance/server/guidance";
import { required } from "../src/shared/lib/required";
const sql = new PGlite();
const db: Database = {
  query: (q, v) => sql.query(q, v),
  transaction: (work) => sql.transaction((tx) => work(tx)),
};
const lab = experimentService(db),
  projects = projectService(db);
const owner: Actor = { userId: "lab-owner", verifiedEmails: [], displayName: "Owner" },
  member: Actor = { userId: "lab-member", verifiedEmails: [] },
  outsider: Actor = { userId: "lab-outsider", verifiedEmails: [] };
const plan = {
  claim: "A shorter form is easier to use",
  method: "Observe five synthetic sessions",
  criteria: "Four finish without help",
  scope: "This prototype only",
  metric: "",
  baseline: "",
  owner: "",
  limits: "No external writes",
  milestone: "First prototype",
  nodeId: "",
};
before(async () => {
  for (const f of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort())
    await sql.exec(await readFile(`migrations/${f}`, "utf8"));
});
after(() => sql.close());
async function setup() {
  const id = await projects.create(owner, { name: "Synthetic lab", description: "Test only" });
  await db.query(
    "INSERT INTO project_memberships(project_id,user_id,role,display_name) VALUES($1,$2,'member','Member')",
    [id, member.userId],
  );
  return id;
}
test("full lifecycle preserves plans, unknowns, evidence snapshots and separate decisions", async () => {
  const id = await setup();
  let e = required((await lab.create(owner, id, plan))[0]);
  e = required(
    (await lab.change(member, id, e.id, e.revision, { kind: "start", executor: "Human" }))[0],
  );
  const run = required(e.runs[0]);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "plan",
        plan: { ...plan, criteria: "All five finish" },
      })
    )[0],
  );
  assert.equal(e.plans.length, 2);
  assert.equal(e.runs[0]?.plan_id, e.plans[0]?.id);
  assert.equal(e.runs[0]?.stale, true);
  await assert.rejects(
    lab.change(owner, id, e.id, 1, { kind: "start", executor: "Retry" }),
    /changed/,
  );
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "evidence",
        runId: run.id,
        evidenceKind: "observation",
        content: "Three finished, two asked for help",
        source: "Synthetic observation notes",
        measurement: "3",
        unit: "people",
      })
    )[0],
  );
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "finish",
        runId: run.id,
        status: "completed",
        effortMinutes: null,
        cost: "",
        deviations: "Synthetic test",
      })
    )[0],
  );
  assert.equal(e.runs[0]?.effort_minutes, null);
  assert.equal(e.runs[0]?.cost, null);
  assert.equal(e.reviews.length, 0);
  const review = {
    kind: "review",
    runId: run.id,
    assessment: "contradicted",
    nextAction: "revise",
    rationale: "Three falls below four",
    reconciliation: "",
  };
  await assert.rejects(lab.change(owner, id, e.id, e.revision, review), /Context changed/);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        ...review,
        reconciliation: "Review applies to the original four-person threshold only",
      })
    )[0],
  );
  assert.equal(e.reviews[0]?.snapshot.plan.definition.criteria, plan.criteria);
  assert.equal(e.reviews[0]?.snapshot.evidence.length, 1);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "evidence",
        runId: run.id,
        evidenceKind: "observation",
        content: "Correction: observation was incomplete",
        source: "Follow-up note",
      })
    )[0],
  );
  assert.equal(e.reviews[0]?.snapshot.evidence.length, 1);
  assert.equal(e.evidence.length, 2);
  e = required(
    (
      await lab.change(member, id, e.id, e.revision, { kind: "start", executor: "Second attempt" })
    )[0],
  );
  assert.equal(e.runs.length, 2);
  assert.equal(e.runs[1]?.plan_id, e.plans[1]?.id);
  await assert.rejects(
    lab.change(owner, id, e.id, e.revision, {
      kind: "finish",
      runId: run.id,
      status: "completed",
      effortMinutes: 0,
    }),
    /already ended/,
  );
});
test("AI proposals retain original authorship, require human review and cannot establish empirical support alone", async () => {
  const id = await setup();
  let e = required((await lab.create(owner, id, plan))[0]);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, { kind: "start", executor: "External agent" })
    )[0],
  );
  const run = required(e.runs[0]);
  e = required(
    (
      await lab.change(member, id, e.id, e.revision, {
        kind: "propose",
        runId: run.id,
        agent: "Synthetic agent",
        content: "Likely easier",
        source: "Reasoning only; no observed sessions",
      })
    )[0],
  );
  assert.equal(e.evidence.length, 0);
  const proposal = required(e.proposals[0]);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "resolve",
        proposalId: proposal.id,
        decision: "edited",
        content: "Hypothesis: likely easier; untested",
        note: "Scope and sources reviewed",
      })
    )[0],
  );
  assert.equal(e.proposals[0]?.content, "Likely easier");
  assert.equal(e.proposals[0]?.reviewer_id, owner.userId);
  assert.equal(e.evidence[0]?.kind, "ai_analysis");
  await assert.rejects(
    lab.change(owner, id, e.id, e.revision, {
      kind: "resolve",
      proposalId: proposal.id,
      decision: "accepted",
      note: "Again",
    }),
    /already reviewed/,
  );
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "finish",
        runId: run.id,
        status: "completed",
        effortMinutes: 0,
      })
    )[0],
  );
  await assert.rejects(
    lab.change(owner, id, e.id, e.revision, {
      kind: "review",
      runId: run.id,
      assessment: "supported",
      nextAction: "continue",
      rationale: "Agent said so",
    }),
    /AI analysis alone/,
  );
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "review",
        runId: run.id,
        assessment: "inconclusive",
        nextAction: "continue",
        rationale: "Needs observation",
      })
    )[0],
  );
  assert.equal(e.reviews.length, 1);
});
test("reads, writes, nested IDs and briefs enforce project membership including revocation", async () => {
  const id = await setup(),
    other = await setup();
  let e = required((await lab.create(owner, id, plan))[0]);
  e = required(
    (await lab.change(owner, id, e.id, e.revision, { kind: "start", executor: "Human" }))[0],
  );
  const run = required(e.runs[0]);
  await assert.rejects(lab.list(outsider, id));
  await assert.rejects(lab.create(outsider, id, plan));
  await assert.rejects(
    lab.change(outsider, id, e.id, e.revision, { kind: "start", executor: "Intruder" }),
  );
  await assert.rejects(lab.brief(outsider, id, e.id, run.id));
  await assert.rejects(
    lab.change(owner, other, e.id, e.revision, { kind: "start", executor: "Wrong project" }),
  );
  await assert.rejects(lab.brief(owner, other, e.id, run.id));
  let second = required((await lab.create(owner, other, plan))[0]);
  await assert.rejects(
    lab.change(owner, other, second.id, second.revision, {
      kind: "evidence",
      runId: run.id,
      evidenceKind: "observation",
      content: "Forged",
      source: "Forged",
    }),
  );
  await assert.rejects(
    db.query(
      "INSERT INTO experiment_evidence(project_id,experiment_id,run_id,kind,content,source,author_id) VALUES($1,$2,$3,'observation','x','x','x')",
      [other, second.id, run.id],
    ),
  );
  const brief = JSON.parse(await lab.brief(member, id, e.id, run.id));
  assert.equal(brief.plan.baseline, "");
  assert.equal(brief.runId, run.id);
  await db.query("DELETE FROM project_memberships WHERE project_id=$1 AND user_id=$2", [
    id,
    member.userId,
  ]);
  await assert.rejects(lab.list(member, id));
  await assert.rejects(lab.brief(member, id, e.id, run.id));
  await assert.rejects(
    lab.change(member, id, e.id, e.revision, { kind: "start", executor: "Removed" }),
  );
});
test("linked question snapshot detects later answer edits and export refuses likely secrets", async () => {
  const id = await setup();
  const guidance = guidanceService(db);
  await guidance.select(owner, id, "venture");
  const g = required(await guidance.get(owner, id));
  const node = required(g.flow.stages[0]?.nodes.find((n) => n.kind === "question"));
  let e = required((await lab.create(owner, id, { ...plan, nodeId: node.id }))[0]);
  e = required(
    (await lab.change(owner, id, e.id, e.revision, { kind: "start", executor: "Human" }))[0],
  );
  const run = required(e.runs[0]);
  await db.query(
    "UPDATE node_answers SET revision=revision+1,content=$3 WHERE project_id=$1 AND node_id=$2",
    [id, node.id, "Updated idea"],
  );
  e = required((await lab.list(owner, id))[0]);
  assert.equal(e.runs[0]?.stale, true);
  assert.notEqual(e.runs[0]?.context.content, "Updated idea");
  assert.equal(JSON.parse(await lab.brief(owner, id, e.id, run.id)).stale, true);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "plan",
        plan: { ...plan, limits: "api_key=synthetic-secret-for-test-only" },
      })
    )[0],
  );
  e = required(
    (await lab.change(owner, id, e.id, e.revision, { kind: "start", executor: "Human" }))[0],
  );
  await assert.rejects(lab.brief(owner, id, e.id, required(e.runs.at(-1)).id), /Possible secret/);
});

test("stale agent acceptance requires explicit reconciliation and rejection keeps evidence unchanged", async () => {
  const id = await setup();
  let e = required((await lab.create(owner, id, plan))[0]);
  e = required(
    (await lab.change(owner, id, e.id, e.revision, { kind: "start", executor: "Agent" }))[0],
  );
  const run = required(e.runs[0]);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "propose",
        runId: run.id,
        agent: "Synthetic agent",
        content: "Draft",
        source: "Synthetic analysis",
      })
    )[0],
  );
  const proposal = required(e.proposals[0]);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "plan",
        plan: { ...plan, scope: "Changed scope" },
      })
    )[0],
  );
  await assert.rejects(
    lab.change(owner, id, e.id, e.revision, {
      kind: "resolve",
      proposalId: proposal.id,
      decision: "accepted",
      note: "Reviewed",
    }),
    /explicitly acknowledge/,
  );
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "resolve",
        proposalId: proposal.id,
        decision: "accepted",
        note: "Applies only to the original scope",
        acknowledgeStale: true,
      })
    )[0],
  );
  assert.equal(e.evidence.length, 1);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "propose",
        runId: run.id,
        agent: "Synthetic agent",
        content: "Unsupported second proposal",
        source: "No source",
      })
    )[0],
  );
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "resolve",
        proposalId: required(e.proposals.at(-1)).id,
        decision: "rejected",
        note: "Unsupported",
      })
    )[0],
  );
  assert.equal(e.evidence.length, 1);
  assert.equal(e.proposals.at(-1)?.status, "rejected");
  await assert.rejects(
    lab.create(owner, id, { ...plan, nodeId: "foreign-question" }),
    /Choose a question/,
  );
  const before = e.revision;
  await assert.rejects(
    lab.change(owner, id, e.id, e.revision, {
      kind: "finish",
      runId: run.id,
      status: "completed",
      effortMinutes: -1,
    }),
    /numeric limits/,
  );
  assert.equal(required((await lab.list(owner, id))[0]).revision, before);
  e = required(
    (
      await lab.change(owner, id, e.id, e.revision, {
        kind: "finish",
        runId: run.id,
        status: "cancelled",
        effortMinutes: null,
      })
    )[0],
  );
  await assert.rejects(
    lab.change(owner, id, e.id, e.revision, {
      kind: "review",
      runId: run.id,
      assessment: "supported",
      nextAction: "continue",
      rationale: "Cancelled",
    }),
    /Complete the run/,
  );
});

test("unmigrated databases fail safely after membership checks and become ready after the additive migration", async () => {
  const old = new PGlite();
  const oldDb: Database = {
    query: (q, v) => old.query(q, v),
    transaction: (work) => old.transaction((tx) => work(tx)),
  };
  try {
    for (const f of (await readdir("migrations"))
      .filter((f) => f.endsWith(".sql") && !f.startsWith("016_") && !f.startsWith("029_"))
      .sort())
      await old.exec(await readFile(`migrations/${f}`, "utf8"));
    const id = await projectService(oldDb).create(owner, {
      name: "Migration fixture",
      description: "Synthetic existing project",
    });
    const service = experimentService(oldDb);
    assert.equal(await service.available(owner, id), false);
    await assert.rejects(service.available(outsider, id));
    await assert.rejects(service.list(owner, id), /awaiting its database update/);
    await assert.rejects(service.create(owner, id, plan), /awaiting its database update/);
    await old.exec(await readFile("migrations/016_experiment_lab.sql", "utf8"));
    assert.equal(await service.available(owner, id), false);
    const experiment = randomUUID(),
      planId = randomUUID(),
      runId = randomUUID();
    await old.query("INSERT INTO experiments(id,project_id,created_by) VALUES($1,$2,$3)", [
      experiment,
      id,
      owner.userId,
    ]);
    await old.query(
      "INSERT INTO experiment_plans(id,project_id,experiment_id,version,definition,author_id) VALUES($1,$2,$3,1,$4,$5)",
      [planId, id, experiment, JSON.stringify(plan), owner.userId],
    );
    await old.query(
      "INSERT INTO experiment_runs(id,project_id,experiment_id,plan_id,context,executor,started_by) VALUES($1,$2,$3,$4,$5,'Synthetic tester',$6)",
      [
        runId,
        id,
        experiment,
        planId,
        JSON.stringify({ nodeId: "", revision: 0, content: "", prompt: "" }),
        owner.userId,
      ],
    );
    await old.exec(await readFile("migrations/029_iteration_workflow.sql", "utf8"));
    assert.equal(await service.available(owner, id), true);
    const migrated = required((await service.list(owner, id))[0]);
    assert.equal(migrated.id, experiment);
    assert.equal(migrated.stage, "run");
    assert.equal(migrated.plans[0]?.id, planId);
    assert.equal(migrated.runs[0]?.id, runId);
    assert.deepEqual(migrated.reflections, []);
    assert.equal((await projectService(oldDb).get(owner, id)).name, "Migration fixture");
  } finally {
    await old.close();
  }
});

test("every project flow supports a linked test, retained results and a separate next decision", async () => {
  const { flows } = await import("../src/features/guidance/model/flows");
  const { experimentPrompts } = await import("../src/features/experiments/flow-prompts");
  const { messages } = await import("../src/shared/i18n/index");
  assert.deepEqual(Object.keys(experimentPrompts).sort(), Object.keys(flows).sort());
  for (const flow of Object.values(flows)) {
    for (const prompt of Object.values(experimentPrompts[flow.id]))
      assert.ok(messages[prompt], `Missing Spanish prompt for ${flow.id}: ${prompt}`);
    const id = await setup();
    const guidance = guidanceService(db);
    await guidance.select(owner, id, flow.id);
    const node = required(
      flow.stages.flatMap((stage) => stage.nodes).find((node) => node.kind === "question"),
    );
    let e = required((await lab.create(owner, id, { ...plan, nodeId: node.id }))[0]);
    e = required(
      (
        await lab.change(owner, id, e.id, e.revision, {
          kind: "start",
          executor: "Synthetic tester",
        })
      )[0],
    );
    const run = required(e.runs[0]);
    assert.equal(run.context.nodeId, node.id);
    e = required(
      (
        await lab.change(owner, id, e.id, e.revision, {
          kind: "evidence",
          runId: run.id,
          evidenceKind: "observation",
          content: "Four completed independently in this synthetic test.",
          source: "Synthetic observation log",
          measurement: "4",
          unit: "participants",
        })
      )[0],
    );
    e = required(
      (
        await lab.change(owner, id, e.id, e.revision, {
          kind: "finish",
          runId: run.id,
          status: "completed",
          effortMinutes: null,
          cost: "",
          deviations: "",
        })
      )[0],
    );
    assert.equal(e.reviews.length, 0, `${flow.id}: completion must not infer validation`);
    e = required(
      (
        await lab.change(owner, id, e.id, e.revision, {
          kind: "review",
          runId: run.id,
          assessment: "supported",
          nextAction: "revise",
          rationale: "This bounded pilot met its criterion; revise before a broader repeat.",
          reconciliation: "",
        })
      )[0],
    );
    assert.equal(e.reviews[0]?.assessment, "supported");
    assert.equal(e.reviews[0]?.next_action, "revise");
    assert.equal((await guidance.get(owner, id))?.flow.id, flow.id);
    await assert.rejects(lab.list(outsider, id));
  }
});

test("iteration stages preserve results and reflection history stays bounded and project-scoped", async () => {
  const projectId = await setup();
  let item = required((await lab.create(owner, projectId, plan))[0]);
  assert.equal(item.stage, "plan");
  item = required(
    (
      await lab.change(member, projectId, item.id, item.revision, {
        kind: "stage",
        stage: "review",
      })
    )[0],
  );
  assert.equal(item.reviews.length, 0);
  assert.equal(item.evidence.length, 0);
  const revision = item.revision;
  item = required(
    (
      await lab.change(owner, projectId, item.id, revision, {
        kind: "reflection",
        prompt: "learned",
        content: "We need more observations.",
      })
    )[0],
  );
  await assert.rejects(
    lab.change(member, projectId, item.id, revision, {
      kind: "reflection",
      prompt: "learned",
      content: "Stale answer",
    }),
    /changed/,
  );
  assert.equal(item.reflections[0]?.author_name, "Owner");
  await db.query(
    "INSERT INTO iteration_reflections(project_id,experiment_id,prompt,revision,content,author_id,author_name) SELECT $1,$2,'learned',n,'Synthetic reflection '||n,$3,'Member' FROM generate_series(2,10001) n",
    [projectId, item.id, member.userId],
  );
  const taskQueries: string[] = [];
  const tasks = taskService({
    ...db,
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          query(sql, values) {
            taskQueries.push(sql);
            return tx.query(sql, values);
          },
        }),
      ),
  });
  const list = await tasks.list(member, projectId);
  const saved = await tasks.change(member, projectId, list.revision, {
    kind: "add",
    title: "Revisit the results",
    parentId: null,
  });
  assert.equal(saved.tasks.at(-1)?.title, "Revisit the results");
  assert.ok(
    taskQueries.length > 0 && taskQueries.every((sql) => !sql.includes("iteration_reflections")),
  );
  const current = required((await lab.list(owner, projectId))[0]);
  assert.equal(current.reflections.length, 1);
  assert.equal(current.reflections[0]?.revision, 10001);
  const first = await lab.reflectionHistory(member, projectId, item.id, "learned", 2147483647);
  assert.equal(first.length, 26);
  assert.equal(first[0]?.revision, 10001);
  const second = await lab.reflectionHistory(
    member,
    projectId,
    item.id,
    "learned",
    first[24]!.revision,
  );
  assert.equal(second[0]?.revision, 9976);
  assert.equal(
    (await lab.reflectionHistory(owner, projectId, item.id, "learned", 2))[0]?.content,
    "We need more observations.",
  );
  await assert.rejects(lab.reflectionHistory(outsider, projectId, item.id, "learned", 2147483647));
  const other = await setup();
  await assert.rejects(lab.reflectionHistory(owner, other, item.id, "learned", 2147483647));
});
