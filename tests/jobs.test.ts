import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { jobsStore } from "../src/features/jobs/server/store";
import { createPrivateJobIssue } from "../src/features/jobs/server/linear";
import { jobDate } from "../src/features/jobs/model";
import type { Database } from "../src/server/database/database";
const base = {
  query: "",
  availability: "",
  employer: "",
  contract: "",
  startup: "",
  source: "",
  board: false,
  page: 1,
};
test("jobs read existing evidence and isolate board, dated events, plans and Linear reservations to the verified owner", async () => {
  const pg = new PGlite();
  const db: Database = { query: (q, v) => pg.query(q, v), transaction: (fn) => pg.transaction(fn) };
  try {
    await pg.exec(await readFile("tests/fixtures/job-evidence.sql", "utf8"));
    await pg.exec(await readFile("integrations/jobs/001_workspace.sql", "utf8"));
    const email = "owner@example.invalid",
      owner = { userId: "owner", verifiedEmails: [email] };
    assert.throws(() => jobsStore(db, { userId: "friend", verifiedEmails: [] }, email), /private/);
    assert.throws(() => jobsStore(db, owner, undefined), /private/);
    const store = jobsStore(db, owner, email);
    assert.equal((await store.browse(base)).total, 3);
    assert.equal((await store.browse({ ...base, board: true })).total, 0);
    const [role] = (
      await store.browse({
        ...base,
        employer: "direct",
        contract: "contractor",
        startup: "true",
        source: "linkedin",
        availability: "current",
        query: "TypeScript",
      })
    ).rows;
    assert.ok(role);
    const [archived] = (
      await store.browse({ ...base, employer: "agency", availability: "historical" })
    ).rows;
    assert.equal(archived?.last_checked, null);
    const [unknown] = (await store.browse({ ...base, availability: "unknown" })).rows;
    assert.equal(unknown?.first_observed, null);
    await pg.query(
      "UPDATE job_manager.observations SET status_observed='live official JD; availability unverified' WHERE observation_key='a'",
    );
    assert.equal((await store.detail(role.id)).lead.availability, "unknown");
    const manual = {
      type: "add" as const,
      token: randomUUID(),
      company: "Example",
      title: "Manual role",
      url: "",
      relevance: "",
    };
    const manualId = await store.change(manual);
    assert.equal(await store.change(manual), manualId);
    assert.equal((await store.browse(base)).total, 4);
    const different = jobsStore(db, { ...owner, userId: "replacement" }, email);
    await assert.rejects(different.detail(manualId), /not found/);
    const plan = {
      type: "plan" as const,
      id: role.id,
      revision: 0,
      stage: "pursuing" as const,
      next_action: "Practice SQL",
      follow_up: "2026-12-04",
    };
    await store.change(plan);
    assert.equal((await store.detail(role.id)).events.length, 0);
    await assert.rejects(store.change(plan), /another tab/);
    assert.equal((await store.browse({ ...base, board: true })).total, 1);
    const entry = {
      type: "event" as const,
      id: role.id,
      token: randomUUID(),
      kind: "interview" as const,
      occurred_on: jobDate(),
      detail: "Technical round",
      practice: "Practice joins",
    };
    await store.change(entry);
    await store.change(entry);
    await assert.rejects(store.change({ ...entry, occurred_on: "2099-12-30" }), /dates/);
    const record = await store.detail(role.id);
    assert.equal(record.events.length, 1);
    assert.equal(record.events[0]?.practice, "Practice joins");
    assert.equal(record.lead.follow_up, plan.follow_up);
    assert.equal((await different.detail(role.id)).events.length, 0);
    assert.equal((await different.browse({ ...base, board: true })).total, 0);
    await store.change({ ...plan, revision: 1, stage: null });
    assert.equal((await store.browse({ ...base, board: true })).total, 0);
    assert.equal((await store.detail(role.id)).events.length, 1);
    const slot = await store.linearSlot(role.id);
    assert.equal((await store.linearSlot(role.id)).linear_id, slot.linear_id);
    assert.equal((await pg.query("SELECT * FROM job_manager.observations")).rows.length, 2);
    await pg.exec("CREATE ROLE nakama_jobs_app");
    await pg.exec(await readFile("integrations/jobs/runtime-grants.sql", "utf8"));
    await pg.exec("SET ROLE nakama_jobs_app");
    assert.equal((await store.browse(base)).total, 4);
    await store.change({ ...plan, revision: 2 });
    await assert.rejects(pg.query("SELECT * FROM job_manager.observations"), /permission denied/);
    await assert.rejects(pg.query("DELETE FROM nakama_jobs.events"), /permission denied/);
  } finally {
    await pg.close();
  }
});
test("Linear handoff verifies privacy, retries one stable issue, and sends only the approved title", async () => {
  const id = randomUUID(),
    teamId = randomUUID(),
    title = "Prepare questions",
    url = "https://linear.app/sample/issue/SAMPLE-1";
  let isPrivate = false,
    created = false,
    creates = 0;
  const send: typeof fetch = async (_url, params) => {
    const body = JSON.parse(String(params?.body));
    const team = { id: teamId, visibility: isPrivate ? "private" : "public" };
    const issue = { id, url, team };
    if (body.query.startsWith("mutation")) {
      assert.deepEqual(body.variables.input, { id, teamId, title });
      creates++;
      created = true;
      throw new Error("reply lost");
    }
    return Response.json({ data: { team, issues: { nodes: created ? [issue] : [] } } });
  };
  await assert.rejects(createPrivateJobIssue(id, title, teamId, "test", send), /private/);
  assert.equal(creates, 0);
  isPrivate = true;
  await assert.rejects(createPrivateJobIssue(id, title, teamId, "test", send), /reply lost/);
  assert.equal(await createPrivateJobIssue(id, title, teamId, "test", send), url);
  assert.equal(creates, 1);
});
