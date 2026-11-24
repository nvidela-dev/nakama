import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { homeMetrics } from "../src/features/shell/server/home-metrics";
import { homeActivity } from "../src/features/shell/server/home-activity-store";
import { jobsStore } from "../src/features/jobs/server/store";
import { projectService } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";

const asDatabase = (pg: PGlite): Database => ({
  query: (q, v) => pg.query(q, v),
  transaction: (fn) => pg.transaction(fn),
});
const owner = { userId: "owner", verifiedEmails: ["owner@example.test"] };
const collaborator = { userId: "collaborator", verifiedEmails: ["collab@example.test"] };
const other = { userId: "other", verifiedEmails: ["other@example.test"] };

test("Home activity observes membership before returning events across three distinct workspaces", async () => {
  const pg = new PGlite();
  const jobs = new PGlite();
  const db = asDatabase(pg);
  const jobsDb = asDatabase(jobs);
  const projects = projectService(db);
  const noJobs = () => {
    assert.fail("An unprivileged session must not open the Jobs database");
  };
  try {
    for (const name of (await readdir("migrations")).filter((n) => n.endsWith(".sql")).sort())
      await pg.exec(await readFile(`migrations/${name}`, "utf8"));
    await jobs.exec(await readFile("tests/fixtures/job-evidence.sql", "utf8"));
    for (const name of (await readdir("integrations/jobs"))
      .filter((n) => /^\d+_.+\.sql$/.test(n))
      .sort())
      await jobs.exec(await readFile(`integrations/jobs/${name}`, "utf8"));
    const adminEmail = owner.verifiedEmails[0];
    assert.deepEqual(await homeActivity(db, () => jobsDb, owner, adminEmail), []);
    assert.deepEqual(
      await homeActivity(db, noJobs, { userId: "", verifiedEmails: [] }, adminEmail),
      [],
    );

    const shared = await projects.create(owner, {
      name: "Shared exploration",
      description: "Sample",
    });
    const privateProject = await projects.create(other, {
      name: "Nonmember secret",
      description: "Sample",
    });
    const invite = await projects.invite(owner, shared, collaborator.verifiedEmails[0]);
    await projects.accept(collaborator, invite.token);
    await db.query(
      "UPDATE project_activity SET created_at='2025-01-03T10:00:00Z' WHERE project_id=$1",
      [shared],
    );
    assert.notEqual(shared, privateProject);

    const prospect = randomUUID();
    await db.query("INSERT INTO prospect_catalogues(id,owner_id) VALUES('business','owner')");
    await db.query(
      "INSERT INTO prospect_memberships(catalogue_id,user_id,display_name,role) VALUES('business','owner','Owner','owner'), ('business','collaborator','Collaborator','member')",
    );
    await db.query(
      "INSERT INTO prospect_catalogue_grants(catalogue_id,user_id) VALUES('business','collaborator')",
    );
    await db.query(
      "INSERT INTO prospects(catalogue_id,id,name) VALUES('business',$1,'Consultancy record')",
      [prospect],
    );
    await db.query(
      `INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,note,created_at)
      VALUES('business',$1,'call','owner','Owner','call content must not reach Home','2025-01-04T14:30:00Z'),
        ('business',$1,'stage','owner','Owner','','2025-01-01T12:00:00Z')`,
      [prospect],
    );

    const ownerRole = "m-" + randomUUID();
    const otherRole = "m-" + randomUUID();
    for (const [ownerId, id] of [
      [owner.userId, ownerRole],
      [other.userId, otherRole],
    ]) {
      await jobsDb.query(
        "INSERT INTO nakama_jobs.manual_leads(id,owner_id,company,title,first_observed) VALUES($1,$2,'Example Company',$3,'2025-01-01')",
        [id, ownerId, id],
      );
      await jobsDb.query("INSERT INTO nakama_jobs.tracking(owner_id,lead_id) VALUES($1,$2)", [
        ownerId,
        id,
      ]);
      await jobsDb.query(
        `INSERT INTO nakama_jobs.events(id,owner_id,lead_id,kind,occurred_on,detail,recorded_at)
        VALUES($1,$2,$3,'interview','2025-01-05','interview notes must stay in Jobs','2026-01-01')`,
        [randomUUID(), ownerId, id],
      );
    }

    const items = await homeActivity(db, () => jobsDb, owner, adminEmail);
    assert.deepEqual(
      items.map(({ source, action, href }) => [source, action, href]),
      [
        ["jobs", "Interview logged", `/jobs?role=${ownerRole}`],
        ["consultancy", "Call logged", `/prospects?business=${prospect}`],
        ["explorations", "Exploration created", `/projects/${shared}`],
        ["consultancy", "Prospect stage changed", `/prospects?business=${prospect}`],
      ],
    );
    assert.equal((await jobsStore(jobsDb, owner, adminEmail).detail(ownerRole)).lead.id, ownerRole);
    assert.equal(items[0]?.dateOnly, true);
    assert.equal(items[1]?.dateOnly, undefined);
    assert.equal(items[0]?.occurredAt, "2025-01-05T03:00:00.000000Z");
    assert.equal(new Set(items.map((item) => item.id)).size, items.length);
    assert.ok(!JSON.stringify(items).includes(otherRole));
    assert.doesNotMatch(
      JSON.stringify(items),
      /must not reach|must stay|Nonmember secret|invitation/i,
    );
    assert.deepEqual(
      (await homeActivity(db, noJobs, collaborator, adminEmail)).map(({ title }) => title),
      ["Shared exploration"],
    );
    const readMetrics = (person = owner) =>
      homeMetrics(db, person === owner ? () => jobsDb : noJobs, person, adminEmail);
    const expiredRole = "m-" + randomUUID();
    await jobsDb.query(
      "INSERT INTO nakama_jobs.manual_leads(id,owner_id,company,title,first_observed) VALUES($1,'owner','Example','Expired','2025-01-01')",
      [expiredRole],
    );
    await jobsDb.query(
      "INSERT INTO nakama_jobs.tracking(owner_id,lead_id,stage) VALUES('owner',$1,'waiting')",
      [expiredRole],
    );
    await jobsDb.query(
      "INSERT INTO nakama_jobs.stage_history(owner_id,lead_id,stage,started_at) VALUES('owner',$1,'waiting',now()-interval '336 hours')",
      [expiredRole],
    );
    await jobsDb.query("UPDATE nakama_jobs.tracking SET stage='applied' WHERE owner_id='other'");
    await jobsDb.query(
      "UPDATE nakama_jobs.tracking SET stage='interview' WHERE owner_id='owner' AND lead_id=$1",
      [ownerRole],
    );
    await db.query(
      "UPDATE prospects SET status='ready',assignee_id='owner',on_board=true WHERE id=$1",
      [prospect],
    );
    await db.query(
      "INSERT INTO prospects(catalogue_id,id,name,status,assignee_id,on_board) VALUES('business',$1,'Not on board','ready','owner',false),('business',$2,'Won','deal','owner',true),('business',$3,'Someone else','ready','collaborator',true)",
      [randomUUID(), randomUUID(), randomUUID()],
    );
    const archived = await projects.create(owner, { name: "Archived", description: "Excluded" });
    await projects.setArchived(owner, archived, true);
    await db.query(
      "UPDATE project_activity SET created_at='2025-01-02T00:00:00Z' WHERE project_id=$1",
      [archived],
    );
    assert.deepEqual(await readMetrics(), {
      explorations: { active: 1, withFlow: 0, withoutFlow: 1, parked: 0, finished: 0 },
      consultancy: { active: 1, stages: [{ stage: "ready", label: "Ready to call", count: 1 }] },
      jobs: { active: 1, stages: [{ stage: "interview", label: "Interviewing", count: 1 }] },
    });
    assert.deepEqual(await readMetrics(collaborator), {
      explorations: { active: 1, withFlow: 0, withoutFlow: 1, parked: 0, finished: 0 },
      consultancy: null,
      jobs: null,
    });
    await projects.remove(owner, shared, collaborator.userId);
    assert.equal((await readMetrics(collaborator)).explorations.active, 0);
    assert.deepEqual(await homeActivity(db, noJobs, collaborator, adminEmail), []);

    for (let n = 0; n < 25; n++)
      await db.query(
        `INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,created_at)
        VALUES('business',$1,'call','owner','Owner','2025-01-07T00:00:00Z'::timestamptz + $2::int * interval '1 microsecond')`,
        [prospect, n],
      );
    const newest = await homeActivity(db, () => jobsDb, owner, adminEmail);
    assert.equal(newest.length, 18);
    assert.equal(newest[0]?.occurredAt, "2025-01-07T00:00:00.000024Z");
    assert.equal(newest.at(-1)?.occurredAt, "2025-01-07T00:00:00.000007Z");
  } finally {
    await Promise.all([pg.close(), jobs.close()]);
  }
});
