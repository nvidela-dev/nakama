import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { jobsStore } from "../src/features/jobs/server/store";
import { createPrivateJobIssue } from "../src/features/jobs/server/linear";
import {
  weeksSinceFound,
  weekLabel,
  weekColors,
  foundRange,
} from "../src/features/jobs/discovery-weeks";
import { listedSkills, resumeMatch } from "../src/features/jobs/resume-match";
import { jobDate } from "../src/features/jobs/model";
import type { Database } from "../src/server/database/database";
const base = {
  query: "",
  found: "",
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
    await pg.exec(await readFile("integrations/jobs/002_found_dates.sql", "utf8"));
    await pg.exec(await readFile("integrations/jobs/003_resume_match.sql", "utf8"));
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
    assert.equal((await store.detail(role.id)).match.status, "no-profile");
    await pg.query(
      "INSERT INTO nakama_jobs.resume_profiles(owner_id,skills) VALUES ('owner',ARRAY['TypeScript','React'])",
    );
    await pg.query(
      "UPDATE job_manager.observations SET payload = payload || $1::jsonb WHERE observation_key='a'",
      [
        JSON.stringify({
          stack: ["TS", "React", "Python"],
          requirements: "Python and React",
          fit: "TypeScript experience, Java is on the candidate resume",
        }),
      ],
    );
    const assessed = (await store.browse(base)).matches.get(role.id);
    assert.deepEqual(assessed, {
      status: "scored",
      percent: 67,
      total: 3,
      matched: ["React", "TypeScript"],
      missing: ["Python"],
    });
    assert.deepEqual((await store.detail(role.id)).match, assessed);
    await pg.query(
      "UPDATE job_manager.observations SET payload = payload || $1::jsonb WHERE observation_key='b'",
      [
        JSON.stringify({
          historical_evidence_text: "Stack: Python and Django Fit / gaps: prior React experience",
          structured_source: { stack: "Django" },
        }),
      ],
    );

    const [archived] = (
      await store.browse({ ...base, employer: "agency", availability: "historical" })
    ).rows;
    assert.deepEqual((await store.detail(archived!.id)).match, {
      status: "scored",
      matched: [],
      missing: ["Django", "Python"],
      total: 2,
      percent: 0,
    });
    assert.equal(archived?.last_checked, null);
    assert.equal(archived?.found_on, "2020-12-27");
    assert.deepEqual(
      (await store.browse({ ...base, found: "2" }, "2021-01-04")).rows.map((r) => r.id),
      [archived!.id],
    );
    assert.equal(
      (await store.browse({ ...base, found: "2", query: "nonmatching" }, "2021-01-04")).total,
      0,
    );
    const [unknown] = (await store.browse({ ...base, availability: "unknown" })).rows;
    assert.equal(unknown?.first_observed, null);
    assert.equal(unknown?.found_on, null);
    assert.equal((await store.detail(unknown!.id)).match.status, "no-requirements");
    assert.deepEqual(
      (await store.browse({ ...base, found: "unknown" })).rows.map((r) => r.id),
      [unknown!.id],
    );
    assert.equal((await store.browse(base)).rows.at(-1)?.id, unknown!.id);
    await pg.query(
      "UPDATE job_manager.observations SET first_seen_raw='2021-01-04T01:00:00Z' WHERE observation_key='a'",
    );
    assert.equal((await store.detail(role.id)).lead.found_on, "2021-01-03");
    await pg.query(
      "UPDATE job_manager.observations SET first_seen_raw='2021-02-30' WHERE observation_key='a'",
    );
    assert.equal((await store.detail(role.id)).lead.found_on, jobDate());
    await pg.query(
      "UPDATE job_manager.observations SET status_observed='live official JD; availability unverified' WHERE observation_key='a'",
    );
    assert.equal((await store.detail(role.id)).lead.availability, "unknown");
    await pg.query(
      "UPDATE job_manager.observations SET source_url='https://lnkd.in/p/synthetic' WHERE observation_key='a'",
    );
    assert.equal((await store.browse({ ...base, source: "linkedin" })).total, 1);
    await pg.query(
      "UPDATE job_manager.observations SET source_url='https://lnkd.in.example.invalid/other' WHERE observation_key='a'",
    );
    assert.equal((await store.browse({ ...base, source: "linkedin" })).total, 0);
    const manual = {
      type: "add" as const,
      token: randomUUID(),
      company: "Example",
      title: "Manual role",
      listed_skills: "TypeScript and Rust",
      url: "",
      relevance: "",
    };
    const manualId = await store.change(manual);
    assert.equal(await store.change(manual), manualId);
    assert.equal((await store.detail(manualId)).lead.found_on, jobDate());
    assert.deepEqual((await store.detail(manualId)).match, {
      status: "scored",
      matched: ["TypeScript"],
      missing: ["Rust"],
      total: 2,
      percent: 50,
    });
    await assert.rejects(
      store.change({ ...manual, token: randomUUID(), found_on: "2099-12-31" }),
      /dates/,
    );
    assert.equal((await store.browse(base)).total, 4);
    const different = jobsStore(db, { ...owner, userId: "replacement" }, email);
    await assert.rejects(different.detail(manualId), /not found/);
    assert.equal((await different.detail(role.id)).match.status, "no-profile");
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
    await assert.rejects(
      pg.query("UPDATE nakama_jobs.resume_profiles SET skills=ARRAY['Rust']"),
      /permission denied/,
    );
    const backdated = await store.change({
      ...manual,
      token: randomUUID(),
      found_on: "2020-12-28",
    });
    assert.equal((await store.detail(backdated)).lead.found_on, "2020-12-28");
    const ancient = await store.browse({ ...base, found: "4+" }, "2021-02-01");
    assert.deepEqual(
      ancient.rows.map((r) => r.id),
      [backdated, archived!.id],
    );
    // A later page should still fall in discovery order when many newer leads are added.
    await pg.query(
      "INSERT INTO nakama_jobs.manual_leads(id,owner_id,company,title,first_observed) SELECT 'm-'||gen_random_uuid(),'owner','Sample','Role '||n,'2021-01-05' FROM generate_series(1,45) n",
    );
    const pageTwo = await store.browse({ ...base, page: 2 });
    assert.deepEqual(
      pageTwo.rows.slice(-3).map((r) => r.id),
      [backdated, archived!.id, unknown!.id],
    );
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

test("discovery weeks use Monday boundaries across years, and each age has a text and color", () => {
  const today = "2021-01-04";
  for (const [date, weeks, label, color] of [
    [today, 0, "This week", "green"],
    ["2021-01-03", 1, "Last week", "green"],
    ["2020-12-27", 2, "{count} weeks ago", "yellow"],
    ["2020-12-20", 3, "{count} weeks ago", "orange"],
    ["2020-12-14", 3, "{count} weeks ago", "orange"],
    ["2020-12-13", 4, "{count} weeks ago", "red"],
    ["2020-12-06", 5, "{count} weeks ago", "red"],
    [null, null, "Unknown date", "muted"],
  ] as const) {
    assert.equal(weeksSinceFound(date, today), weeks);
    assert.equal(weekLabel(weeks), label);
    assert.ok(weekColors(weeks).includes(color));
    if (date && weeks !== null) {
      const range = foundRange(weeks >= 4 ? "4+" : String(weeks), today)!;
      assert.ok((!range.since || date >= range.since) && date < range.until);
    }
  }
  assert.equal(weeksSinceFound("2020-12-28", "2021-01-03"), 0);
});

test("résumé skills use word boundaries, aliases and distinct listed skills", () => {
  assert.deepEqual(listedSkills("Next.js JavaScript JavaScript React Native C++ C# Golang"), [
    "C#",
    "C++",
    "Go",
    "JavaScript",
    "Next.js",
    "React Native",
  ]);
  assert.deepEqual(listedSkills("go to the rest of the team, expressiveness and JavaBeans"), []);
  assert.deepEqual(resumeMatch(new Set(["PostgreSQL"]), "Postgres / PostgreSQL and PHP"), {
    status: "scored",
    percent: 50,
    total: 2,
    matched: ["PostgreSQL"],
    missing: ["PHP"],
  });
});
