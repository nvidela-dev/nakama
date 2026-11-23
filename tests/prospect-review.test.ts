import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Database } from "../src/server/database/database";
import { prospectService } from "../src/features/prospects/server/catalogue";
import { prospectReview } from "../src/features/prospects/server/review";
import {
  assessmentScore,
  type Assessment,
  type CallReview,
} from "../src/features/prospects/review-model";

test("assessment displays completion and computes an average only when all four distinct ratings exist", () => {
  assert.deepEqual(assessmentScore({}), { done: 0, total: 4, average: null });
  assert.deepEqual(assessmentScore({ evidence: 2, impact: 3, fit: 2 }), {
    done: 3,
    total: 4,
    average: null,
  });
  assert.deepEqual(assessmentScore({ evidence: 2, impact: 3, fit: 2, pay: 1 }), {
    done: 4,
    total: 4,
    average: 2,
  });
});

test("private fit and call drafts are revision checked, preserve old CRM, and deny all collaborator scopes", async () => {
  const sql = new PGlite();
  const db: Database = { query: (q, v) => sql.query(q, v), transaction: (f) => sql.transaction(f) };
  const priorId = randomUUID(),
    id = randomUUID();
  const owner = { userId: "Owner", displayName: "Owner", verifiedEmails: [] as string[] };
  const member = {
    userId: "Member",
    displayName: "Member",
    verifiedEmails: ["member@example.invalid"],
  };
  const crm = prospectService(db);
  const review = prospectReview(db);
  try {
    const files = (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files.filter((f) => f < "033"))
      await sql.exec(await readFile("migrations/" + file, "utf8"));
    await db.query("INSERT INTO prospect_catalogues VALUES('business','Owner')");
    await db.query("INSERT INTO prospect_memberships VALUES('business','Owner','Owner','owner')");
    await db.query(
      "INSERT INTO prospects(catalogue_id,id,name,status) VALUES('business',$1,'Prior business','ready')",
      [priorId],
    );
    await db.query(
      "INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,note) VALUES('business',$1,'call','Owner','Owner','Original call')",
      [priorId],
    );
    for (const file of files.filter((f) => f >= "033"))
      await sql.exec(await readFile("migrations/" + file, "utf8"));
    const before = await crm.read(owner, priorId);
    assert.equal(before.prospect?.status, "ready");
    assert.equal(before.timeline[0]?.note, "Original call");
    assert.deepEqual(await review.read(owner, priorId), {
      assessment: null,
      draft: null,
      history: [],
      previous: null,
    });

    await crm.change(owner, { type: "add", record: { id, name: "New business", details: "" } });
    const status = async () => (await crm.read(owner, id)).prospect?.status;
    assert.equal(await status(), "assess_fit");
    await assert.rejects(
      crm.change(owner, { type: "stage", id, revision: 0, status: "ready" }),
      /private assessment/,
    );
    const assessment: Assessment = {
      answers: { business: "Test premise", budget: "Private budget hypothesis" },
      ratings: { evidence: 2, impact: 3, fit: 2, pay: 1 },
      decision: "research",
    };
    const assess = (value: Assessment, revision: number, advance = false) =>
      review.change(owner, { type: "assessment", prospectId: id, revision, value, advance });
    await assert.rejects(assess(assessment, 0, true), /Choose Ready/);
    await assess(assessment, 0);
    assert.deepEqual((await review.read(owner, id)).assessment?.value, assessment);
    assert.equal(await status(), "assess_fit");
    await assert.rejects(assess(assessment, 0), /draft changed/);
    await assess({ ...assessment, decision: "park" }, 1);
    assert.equal(await status(), "assess_fit");
    await assess({ ...assessment, decision: "ready" }, 2);
    assert.equal(await status(), "assess_fit");
    await assess({ ...assessment, decision: "ready" }, 3, true);
    assert.equal(await status(), "ready");
    assert.deepEqual((await crm.read(owner, id)).timeline[0]?.profile_changes, {
      from: "assess_fit",
      to: "ready",
    });

    const call = (value: CallReview, revision: number, draftId: string | null, record = false) =>
      review.change(owner, { type: "call", prospectId: id, revision, value, draftId, record });
    const pending: CallReview = {
      outcome: "well",
      clicked: "Private call observation",
      interest: 3,
      commitment: 1,
      actions: [{ task: "Private sales task", due: "" }],
    };
    const draft = await call(pending, 0, null);
    assert.deepEqual((await review.read(owner, id)).draft?.value, pending);
    assert.equal((await review.read(owner, id)).history.length, 0);
    await assert.rejects(call(pending, 0, null), /draft changed/);
    await assert.rejects(call(pending, draft.revision, draft.draftId, true), /result and date/);
    await assert.rejects(
      call({ ...pending, happenedOn: "2026-11-23" }, draft.revision, draft.draftId, true),
      /date before recording/,
    );
    await call(
      {
        ...pending,
        happenedOn: "2026-11-23",
        actions: [{ task: "Private sales task", due: "2026-11-26" }],
      },
      draft.revision,
      draft.draftId,
      true,
    );
    const attempt: CallReview = { outcome: "no_answer", happenedOn: "2026-11-24", actions: [] };
    await assert.rejects(
      call({ ...attempt, interest: 1 }, 0, null, true),
      /Check the prospect review/,
    );
    await assert.rejects(
      call({ ...attempt, happenedOn: "2026-02-31" }, 0, null, true),
      /Check the prospect review/,
    );
    await call(attempt, 0, null, true);
    await call(
      {
        outcome: "voicemail",
        happenedOn: "2026-11-25",
        actions: [{ task: "Try tomorrow", due: "2026-11-26" }],
      },
      0,
      null,
      true,
    );
    const poor: CallReview = {
      outcome: "poorly",
      happenedOn: "2026-11-26",
      reason: "Unknown",
      objection: 1,
      recoverability: 2,
      next: "follow_up",
      actions: [],
    };
    await assert.rejects(call(poor, 0, null, true), /dated action/);
    await call(
      { ...poor, actions: [{ task: "Clarify the blocker", due: "2026-11-27" }] },
      0,
      null,
      true,
    );
    const recorded = await review.read(owner, id);
    assert.equal(recorded.draft, null);
    assert.deepEqual(
      recorded.history.map((entry) => entry.value.outcome),
      ["poorly", "voicemail", "no_answer", "well"],
    );
    assert.deepEqual(recorded.history[2]?.value, attempt);
    assert.equal(recorded.history[3]?.value.interest, 3);
    assert.equal(recorded.history[0]?.value.objection, 1);
    const oldShared = await crm.read(owner, priorId);
    assert.equal(oldShared.timeline[0]?.note, "Original call");
    assert.equal((await crm.read(owner, id)).timeline.length, 1);

    await crm.change(owner, { type: "invite", email: member.verifiedEmails[0] });
    await crm.read(member);
    await crm.change(owner, {
      type: "assign",
      id,
      revision: (await crm.read(owner, id)).prospect!.revision,
      assignee: member.userId,
    });
    await crm.change(owner, { type: "share", id, userId: member.userId, enabled: true });
    await crm.change(owner, { type: "access", userId: member.userId, enabled: true });
    const memberDetail = await crm.read(member, id);
    assert.equal(memberDetail.prospect?.status, "ready");
    assert.doesNotMatch(
      JSON.stringify(memberDetail),
      /Private call observation|Private sales task|Private budget hypothesis/,
    );
    const memberBacklog = await crm.read(member, undefined, 1, "", new URLSearchParams());
    assert.doesNotMatch(
      JSON.stringify(memberBacklog),
      /Private call observation|Private sales task|Private budget hypothesis/,
    );
    await assert.rejects(review.read(member, id), /access is private/);
    await assert.rejects(
      review.change(member, {
        type: "assessment",
        prospectId: id,
        revision: 4,
        value: assessment,
        advance: false,
      }),
      /access is private/,
    );
    await assert.rejects(
      review.change(member, {
        type: "call",
        prospectId: id,
        revision: 0,
        draftId: null,
        value: attempt,
        record: true,
      }),
      /access is private/,
    );
    await assert.rejects(review.read(owner, randomUUID()), /review unavailable/);
  } finally {
    await sql.close();
  }
});
