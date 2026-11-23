import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { strToU8, zipSync } from "fflate";
import type { Database } from "../src/server/database/database";
import type { Actor } from "../src/shared/contracts/actor";
import { salesStages, statusLabel } from "../src/features/prospects/model";
import { prospectService } from "../src/features/prospects/server/catalogue";
import { projectService } from "../src/features/projects/server/projects";
import { decodeSource, checksum } from "../src/features/prospects/server/source-reader";
import { sourceImports } from "../src/features/prospects/server/imports";
import initSql from "sql.js/dist/sql-asm.js";
import { gzipSync } from "node:zlib";

test("catalogue export preserves stable business IDs, reads contacts, ignores unrelated files", async () => {
  const id = randomUUID();
  const index = strToU8(
    JSON.stringify({
      businesses: [{ id, name: "Test business", city: "Sample City", category: "Studio" }],
    }),
  );
  const zip = zipSync({
    "site/dist/data/catalogue.json": index,
    [`site/dist/data/${id}.json`]: strToU8(
      JSON.stringify({ id, contacts: [{ display_value: "test@example.invalid" }] }),
    ),
  });
  const parsed = await decodeSource(zip);
  assert.equal(parsed.records[0]?.id, id);
  assert.equal(parsed.records[0]?.details, "Sample City\nStudio\ntest@example.invalid");
  assert.equal(parsed.records[0]?.rank, 2);
  await assert.rejects(decodeSource(index), /complete archive/);
  await assert.rejects(decodeSource(strToU8("{}")));
});
test("standalone catalogue, single assignee, permission changes and preserved outreach history", async () => {
  const sql = new PGlite();
  try {
    for (const file of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort())
      await sql.exec(await readFile("migrations/" + file, "utf8"));
    const db: Database = {
      query: (q, v) => sql.query(q, v),
      transaction: (fn) => sql.transaction((tx) => fn(tx)),
    };
    const ps = projectService(db),
      svc = prospectService(db);
    const user = (userId: string) => ({
      userId,
      displayName: userId,
      verifiedEmails: [userId.toLowerCase() + "@example.invalid"],
    });
    const owner = user("Owner"),
      ana = user("Ana"),
      pedro = user("Pedro"),
      outside = user("Other");
    const unrelated = await ps.create(outside, {
      name: "Unrelated",
      description: "Project ownership alone grants no catalogue access",
    });
    await db.query("INSERT INTO prospect_catalogues VALUES('business',$1)", [owner.userId]);
    await db.query("INSERT INTO prospect_memberships VALUES('business',$1,$1,'owner')", [
      owner.userId,
    ]);
    async function join(id: string) {
      const invited = user(id);
      await svc.change(owner, { type: "invite", email: invited.verifiedEmails[0] });
      await assert.rejects(svc.read({ ...invited, verifiedEmails: [] }));
      await svc.read(invited);
    }
    const expired = user("Expired");
    const invitationStatus = async () =>
      (await svc.read(owner)).invitations.find((i) => i.email === expired.verifiedEmails[0])?.state;
    await svc.change(owner, { type: "invite", email: expired.verifiedEmails[0] });
    assert.equal(await invitationStatus(), "Pending");
    await db.query(
      "UPDATE prospect_invitations SET expires_at=now()-interval '1 minute' WHERE email=$1",
      [expired.verifiedEmails[0]],
    );
    assert.equal(await invitationStatus(), "Expired");
    await assert.rejects(svc.read(expired));
    await svc.change(owner, { type: "invite", email: expired.verifiedEmails[0] });
    await svc.change(owner, { type: "cancel_invite", email: expired.verifiedEmails[0] });
    assert.equal(await invitationStatus(), "Revoked");
    await assert.rejects(svc.read(expired));
    await join(expired.userId);
    assert.equal(await invitationStatus(), "Accepted");
    await svc.change(owner, { type: "remove", userId: expired.userId });
    assert.equal(await invitationStatus(), "Revoked");
    await assert.rejects(svc.read(expired));
    await join(ana.userId);
    await join(pedro.userId);
    const id = randomUUID(),
      another = randomUUID();
    const records = [
      { id, name: "A shop", details: "A contact" },
      { id: another, name: "B shop", details: "B contact" },
    ];
    const change = (p: typeof owner, cmd: object) => svc.change(p, cmd);
    const detail = (p: typeof owner) => svc.read(p, id);
    for (const record of records) await change(owner, { type: "add", record });
    assert.equal((await svc.read(owner)).prospects.length, 2);
    assert.equal((await svc.read(ana)).prospects.length, 0);
    await assert.rejects(detail(ana));
    await assert.rejects(detail(outside));
    await svc.change(owner, { type: "share", id, userId: "Pedro", enabled: true });
    assert.equal((await detail(pedro)).prospect?.assignee_id, null);
    assert.equal((await svc.read(pedro, undefined, 1, "B shop")).prospects.length, 0);
    await svc.change(owner, { type: "share", id, userId: "Pedro", enabled: false });
    await assert.rejects(detail(pedro));
    await assert.rejects(svc.read(outside));
    await assert.rejects(svc.read(owner, "bad-id"));
    await assert.rejects(change(ana, { type: "assign", id, revision: 0, assignee: "Ana" }));
    await assert.rejects(change(owner, { type: "assign", id, revision: 0, assignee: "Other" }));
    await change(owner, { type: "assign", id, revision: 0, assignee: "Ana" });
    assert.equal((await detail(ana)).prospect?.status, "ready");
    assert.equal((await svc.read(ana)).prospects.length, 1);
    await assert.rejects(
      change(pedro, { type: "log", id, revision: 1, kind: "call", note: "Wrong person" }),
    );
    await change(ana, { type: "log", id, revision: 1, kind: "call", note: "No answer" });
    assert.equal((await detail(ana)).prospect?.called, true);
    assert.equal((await detail(ana)).prospect?.status, "ready");
    assert.equal((await detail(ana)).prospect?.latest_call_note, "No answer");
    await assert.rejects(
      change(owner, { type: "assign", id, revision: 1, assignee: "Pedro" }),
      /changed/,
    );
    await change(owner, { type: "assign", id, revision: 2, assignee: "Pedro" });
    await assert.rejects(detail(ana));
    await assert.rejects(
      change(ana, { type: "log", id, revision: 3, kind: "reply", note: "After handoff" }),
    );
    await change(pedro, { type: "log", id, revision: 3, kind: "reply", note: "Asked for offer" });
    await change(pedro, {
      type: "log",
      id,
      revision: 4,
      kind: "call",
      outcome: "rejected",
      note: "Declined for this quarter",
    });
    const handoff = await detail(pedro);
    assert.equal(handoff.prospect?.status, "ready");
    assert.equal(handoff.prospect?.latest_call_outcome, "rejected");
    assert.equal(handoff.prospect?.latest_outcome, "Declined for this quarter");
    assert.deepEqual(
      handoff.timeline.map((e) => [e.kind, e.actor_name, e.previous_assignee, e.next_assignee]),
      [
        ["call", "Pedro", null, null],
        ["reply", "Pedro", null, null],
        ["assignment", "Owner", "Ana", "Pedro"],
        ["call", "Ana", null, null],
        ["assignment", "Owner", null, "Ana"],
      ],
    );
    await assert.rejects(change(ana, { type: "access", userId: "Ana", enabled: true }));
    await change(owner, { type: "access", userId: "Ana", enabled: true });
    assert.equal((await svc.read(ana)).prospects.length, 2);
    await change(ana, { type: "log", id: another, revision: 0, kind: "note", note: "Updated" });
    await change(owner, { type: "access", userId: "Ana", enabled: false });
    assert.equal((await svc.read(ana)).prospects.length, 0);
    assert.deepEqual(await change(owner, { type: "add", record: records[0] }), { added: 0 });
    assert.equal((await detail(owner)).timeline.length, 5);
    await change(owner, { type: "access", userId: "Pedro", enabled: true });
    await svc.change(owner, { type: "remove", userId: "Pedro" });
    await assert.rejects(detail(pedro));
    assert.equal((await detail(owner)).prospect?.assignee_id, null);
    assert.equal((await detail(owner)).timeline[0]?.kind, "membership_ended");
    const key = randomUUID();
    const revision = async () => (await detail(owner)).prospect!.revision;
    await svc.change(owner, {
      type: "todo_add",
      id,
      revision: await revision(),
      todoId: key,
      title: "Arrange a call",
    });
    await svc.change(owner, {
      type: "todo_check",
      id,
      revision: await revision(),
      todoId: key,
      done: true,
    });
    assert.equal((await detail(owner)).todos[0]?.done, true);
    const beforeLinear = await revision();
    await assert.rejects(
      svc.change(owner, {
        type: "linear",
        id,
        revision: beforeLinear,
        url: "https://linear.app.invalid/acme/issue/A-7",
      }),
    );
    await svc.change(owner, {
      type: "linear",
      id,
      revision: beforeLinear,
      url: "https://linear.app/acme/issue/A-7",
    });
    assert.equal((await detail(owner)).linear, "https://linear.app/acme/issue/A-7");
    await assert.rejects(
      svc.change(owner, { type: "stage", id, revision: beforeLinear, status: "deal" }),
    );
    await svc.change(owner, { type: "stage", id, revision: await revision(), status: "deal" });
    await assert.rejects(
      svc.change(pedro, {
        type: "todo_add",
        id,
        revision: await revision(),
        todoId: randomUUID(),
        title: "Hidden",
      }),
    );
    const personal = async (p: typeof owner) =>
      (await svc.read(p, undefined, 1, "", new URLSearchParams({ view: "board" }))).listing!.cards;
    assert.equal((await personal(owner)).length, 0);
    await assert.rejects(
      svc.change(ana, { type: "my_board", id, enabled: true, revision: await revision() }),
    );
    await svc.change(owner, { type: "my_board", id, enabled: true, revision: await revision() });
    assert.equal((await detail(owner)).prospect?.assignee_id, owner.userId);
    assert.equal((await personal(owner))[0]?.status, "deal");
    await svc.change(owner, { type: "stage", id, status: "deal", revision: await revision() });
    const board = await svc.read(
      owner,
      undefined,
      1,
      "",
      new URLSearchParams({ view: "board", stage: "deal", q: "A shop" }),
    );
    assert.equal(board.listing?.counts.deal, 1);
    assert.equal(board.listing?.cards[0]?.id, id);
    const available = await svc.read(ana, undefined, 1, "", new URLSearchParams({ view: "board" }));
    assert.equal(available.listing?.cards.length, 0);
    await join("Pedro");
    assert.equal((await svc.read(pedro)).prospects.length, 0);
    await change(owner, { type: "assign", id, revision: await revision(), assignee: "Ana" });
    assert.equal((await personal(owner)).length, 0);
    assert.equal((await personal(ana)).length, 0);
    await change(ana, { type: "stage", id, revision: await revision(), status: "ready" });
    assert.equal((await personal(ana))[0]?.id, id);
    await change(ana, { type: "my_board", id, revision: await revision(), enabled: false });
    assert.equal((await personal(ana)).length, 0);
    assert.equal((await detail(ana)).prospect?.assignee_id, "Ana");
    await change(owner, { type: "assign", id, revision: await revision(), assignee: "Owner" });
    await ps.deleteProject(outside, unrelated, "Unrelated");
    assert.ok((await detail(owner)).timeline.length > 0);
  } finally {
    await sql.close();
  }
});

test("full catalogue publication, exact recovery, evidence access and conflict-safe native updates", async () => {
  const sql = new PGlite(),
    id = randomUUID();
  const owner = { userId: "owner", displayName: "Owner", verifiedEmails: [] },
    member = { ...owner, userId: "member" };
  const image = Uint8Array.from([255, 216, 255, 224, 0, 0, 255, 217]);
  const extraImage = Uint8Array.from([255, 216, 255, 224, 1, 0, 255, 217]);
  const absent = checksum(extraImage);
  const SQL = await initSql();
  function archive(name: string, at: string, incomplete = false) {
    const db = new SQL.Database();
    try {
      db.run(`CREATE TABLE businesses(id TEXT PRIMARY KEY,name TEXT,website TEXT);
        CREATE TABLE observations(id INTEGER PRIMARY KEY,business_id TEXT REFERENCES businesses(id),facts_json TEXT,exact_id INTEGER DEFAULT 9007199254740993);
        CREATE TABLE contacts(id INTEGER PRIMARY KEY,kind TEXT);
        CREATE TABLE business_contacts(business_id TEXT,contact_id INTEGER,display_value TEXT);
        CREATE TABLE pipeline(business_id TEXT,stage TEXT,notes TEXT);
        CREATE TABLE stage_history(business_id TEXT,to_stage TEXT,changed_at TEXT);
        CREATE TABLE followups(business_id TEXT,task TEXT);
        CREATE TABLE screenshot_artifacts(business_id TEXT,sha256 TEXT);
        CREATE VIEW computed AS SELECT name FROM businesses;`);
      db.run("INSERT INTO businesses VALUES(?,?,?)", [id, name, "example.invalid"]);
      db.run("INSERT INTO observations(id,business_id,facts_json) VALUES(1,?,?)", [
        id,
        JSON.stringify({ evidence: name }),
      ]);
      db.run("INSERT INTO contacts VALUES(1,'email')");
      db.run("INSERT INTO business_contacts VALUES(?,1,'hello@example.invalid')", [id]);
      db.run("INSERT INTO pipeline VALUES(?,'won','accepted offer')", [id]);
      db.run("INSERT INTO stage_history VALUES(?,'won',?)", [id, at]);
      db.run("INSERT INTO followups VALUES(?,'check in')", [id]);
      db.run("INSERT INTO screenshot_artifacts VALUES(?,?),(?,?)", [
        id,
        checksum(image),
        id,
        absent,
      ]);
      const native = db.export();
      return {
        native,
        zip: zipSync({
          "database/prospects.sqlite3.gz": gzipSync(native),
          "site/dist/data/catalogue.json": strToU8(
            JSON.stringify({ meta: { snapshot_at: at }, businesses: [{ id, name }] }),
          ),
          [`site/dist/data/${id}.json`]: strToU8(
            JSON.stringify({ id, notes: ["original dossier"] }),
          ),
          "assets/sample.jpg": image,
          ...(!incomplete ? { "assets/extra.jpg": extraImage } : {}),
        }),
      };
    } finally {
      db.close();
    }
  }
  try {
    for (const file of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort())
      await sql.exec(await readFile("migrations/" + file, "utf8"));
    const db: Database = {
      query: (q, v) => sql.query(q, v),
      transaction: (f) => sql.transaction((tx) => f(tx)),
    };
    await db.query("INSERT INTO prospect_catalogues VALUES('business',$1)", [owner.userId]);
    await db.query(
      "INSERT INTO prospect_memberships VALUES('business',$1,$1,'owner'),('business',$2,$2,'member')",
      [owner.userId, member.userId],
    );
    const imports = sourceImports(db),
      svc = prospectService(db);
    const first = archive("Original", "2026-01-01T00:00:00Z"),
      next = archive("Updated", "2026-02-01T00:00:00Z");
    const digest = checksum(first.zip);
    await assert.rejects(imports.start(member, digest, first.zip.length));
    await imports.start(owner, digest, first.zip.length);
    await assert.rejects(imports.finish(owner, digest));
    await imports.append(owner, digest, 0, new Uint8Array(first.zip.length));
    await assert.rejects(imports.finish(owner, digest));
    await assert.rejects(imports.download(owner, digest));
    assert.equal((await svc.read(owner)).prospects.length, 0);
    async function upload(bytes: Uint8Array) {
      const hash = checksum(bytes);
      await imports.start(owner, hash, bytes.length);
      await imports.append(owner, hash, 0, bytes);
      return imports.finish(owner, hash);
    }
    await assert.rejects(
      upload(archive("Incomplete", "2026-01-01T00:00:00Z", true).zip),
      /referenced attachment/,
    );
    assert.equal((await svc.read(owner)).prospects.length, 0);
    const r = await upload(first.zip);
    assert.equal(r.tables.observations, 1);
    assert.equal(r.businesses, 1);
    assert.equal(r.missingImageFiles, 0);
    assert.equal(r.sourceRecords, 2);
    assert.equal((await decodeSource(first.native)).records[0]?.id, id);
    assert.equal(checksum(Buffer.concat(await imports.download(owner, digest))), digest);
    assert.deepEqual(await imports.start(owner, digest, first.zip.length), r);
    assert.deepEqual(await upload(first.zip), r);
    const detail = () => svc.read(owner, id);
    let d = await detail();
    assert.equal(d.prospect?.status, "deal");
    assert.match(JSON.stringify(d.sources), /accepted offer/);
    assert.match(JSON.stringify(d.sources), /9007199254740993/);
    assert.match(JSON.stringify(d.sources), /original dossier/);
    assert.match(JSON.stringify(d.sources), /check in/);
    assert.match(d.prospect!.details, /hello@example.invalid/);
    await assert.rejects(svc.image(member, id, checksum(image)));
    await assert.rejects(imports.download(member, digest));
    await svc.change(owner, {
      type: "assign",
      id,
      revision: d.prospect!.revision,
      assignee: member.userId,
    });
    assert.deepEqual(
      Buffer.from((await svc.image(member, id, checksum(image))).content),
      Buffer.from(image),
    );
    await assert.rejects(svc.image(owner, id, "a".repeat(64)));
    d = await detail();
    await svc.change(member, {
      type: "log",
      kind: "reply",
      id,
      revision: d.prospect!.revision,
      outcome: "rejected",
      note: "declined",
    });
    const prior = (await detail()).prospect!.revision;
    await assert.rejects(
      svc.change(member, { type: "profile", id, revision: prior, name: "Forbidden" }),
    );
    await svc.change(owner, {
      type: "profile",
      id,
      revision: prior,
      details: "Verified locally",
      research: { pitch: "new offer" },
    });
    await assert.rejects(
      svc.change(owner, {
        type: "profile",
        id,
        revision: prior,
        research: { pitch: "stale" },
      }),
      /changed/,
    );
    assert.equal((await detail()).prospect?.status, "deal");
    await svc.change(member, {
      type: "stage",
      id,
      revision: (await detail()).prospect!.revision,
      status: "proposal_sent",
    });
    await upload(next.zip);
    d = await detail();
    assert.equal(d.prospect?.name, "Updated");
    assert.equal(d.prospect?.details, "Verified locally");
    assert.equal(d.prospect?.status, "proposal_sent");
    assert.equal(d.prospect?.assignee_id, member.userId);
    assert.deepEqual(d.research, { pitch: "new offer" });
    assert.equal(d.timeline.length, 4);
    assert.equal(d.timeline[2]?.outcome, "rejected");
    assert.deepEqual(d.timeline[1]?.profile_changes, {
      details: "Verified locally",
      research: { pitch: "new offer" },
    });
    const stale = await upload(archive("Older", "2025-12-01T00:00:00Z").zip);
    assert.equal(stale.stale, 2);
    await assert.rejects(
      upload(
        strToU8(
          JSON.stringify({
            meta: { snapshot_at: "2027-01-01T00:00:00Z" },
            businesses: [{ id, name: "Sparse" }],
          }),
        ),
      ),
      /complete archive/,
    );
    assert.equal((await detail()).prospect?.name, "Updated");
    assert.equal((await svc.read(owner)).receipts.length, 3);
    assert.equal((await svc.read(member)).receipts.length, 0);
    await assert.rejects(upload(strToU8("{}")));
    assert.equal((await svc.read(owner)).receipts.length, 3);
    await svc.change(owner, {
      type: "assign",
      id,
      revision: (await detail()).prospect!.revision,
      assignee: null,
    });
    await assert.rejects(svc.image(member, id, checksum(image)));
    await db.query("DELETE FROM prospect_catalogues WHERE id='business'");
    assert.equal((await db.query("SELECT digest FROM prospect_imports")).rows.length, 0);
  } finally {
    await sql.close();
  }
});

test("Business stages preserve legacy rows and keep sales activity independent of deliberate moves", async () => {
  const sql = new PGlite();
  try {
    const migrations = (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort();
    const stageMigration = "032_business_sales_stages.sql";
    for (const file of migrations.slice(0, migrations.indexOf(stageMigration)))
      await sql.exec(await readFile("migrations/" + file, "utf8"));
    const db: Database = {
      query: (q, v) => sql.query(q, v),
      transaction: (fn) => sql.transaction((tx) => fn(tx)),
    };
    const svc = prospectService(db);
    const owner = { userId: "Owner", displayName: "Owner", verifiedEmails: [] };
    const outsider = { userId: "Outsider", displayName: "Outsider", verifiedEmails: [] };
    const id = randomUUID(),
      firstTodo = randomUUID(),
      nextTodo = randomUUID();
    await db.query("INSERT INTO prospect_catalogues VALUES ('business', 'Owner')");
    await db.query(
      "INSERT INTO prospect_memberships VALUES ('business', 'Owner', 'Owner', 'owner')",
    );
    await db.query(
      "INSERT INTO prospects(catalogue_id,id,name,status,revision,assignee_id,on_board) VALUES('business',$1,'Prior prospect','in_progress',42,'Owner',true)",
      [id],
    );
    await db.query(
      "INSERT INTO prospect_events(catalogue_id,prospect_id,kind,actor_id,actor_name,note) VALUES('business',$1,'call','Owner','Owner','Prior call')",
      [id],
    );
    for (const file of migrations.slice(migrations.indexOf(stageMigration))) {
      await sql.exec(await readFile("migrations/" + file, "utf8"));
    }
    const detail = () => svc.read(owner, id);
    const board = (stage?: string) =>
      svc.read(
        owner,
        undefined,
        1,
        "",
        new URLSearchParams(stage ? { view: "board", stage } : { view: "board" }),
      );
    const revision = async () => (await detail()).prospect!.revision;
    assert.equal(await revision(), 42);
    assert.equal((await board("in_progress")).listing?.counts.in_progress, 1);
    assert.equal((await detail()).timeline[0]?.note, "Prior call");
    await assert.rejects(
      svc.change(owner, { type: "stage", id, revision: 42, status: "in_progress" }),
      /Check the prospect/,
    );
    await assert.rejects(
      svc.change(outsider, { type: "stage", id, revision: 42, status: "attempted_contact" }),
    );
    await assert.rejects(
      svc.change(owner, { type: "stage", id, revision: 41, status: "attempted_contact" }),
      /changed/,
    );
    assert.deepEqual(
      salesStages.map((stage) => statusLabel[stage]),
      [
        "Ready to call",
        "Attempted contact",
        "In conversation",
        "Proposal sent",
        "Negotiating",
        "Won",
        "Lost",
      ],
    );
    let from = "in_progress";
    for (const status of salesStages) {
      const rev = await revision();
      await svc.change(owner, { type: "stage", id, revision: rev, status });
      const updated = await detail();
      assert.equal(updated.prospect?.status, status);
      assert.equal(updated.prospect?.revision, rev + 1);
      assert.deepEqual(updated.timeline[0]?.profile_changes, { from, to: status });
      assert.equal((await board(status)).listing?.counts[status], 1);
      from = status;
    }
    assert.equal((await board("in_progress")).listing?.counts.in_progress, undefined);
    const beforeNoOp = await revision();
    await svc.change(owner, { type: "stage", id, revision: beforeNoOp, status: "rejected" });
    assert.equal(await revision(), beforeNoOp);
    await svc.change(owner, {
      type: "log",
      id,
      revision: await revision(),
      kind: "call",
      outcome: "deal",
      note: "Reached decision maker",
    });
    await svc.change(owner, {
      type: "log",
      id,
      revision: await revision(),
      kind: "reply",
      note: "Separate reply",
    });
    await svc.change(owner, {
      type: "todo_add",
      id,
      revision: await revision(),
      todoId: firstTodo,
      title: "Old task",
    });
    await svc.change(owner, {
      type: "todo_check",
      id,
      revision: await revision(),
      todoId: firstTodo,
      done: true,
    });
    await svc.change(owner, {
      type: "todo_add",
      id,
      revision: await revision(),
      todoId: nextTodo,
      title: "Follow up Friday",
    });
    const summary = (await board()).listing?.cards[0];
    assert.equal(summary?.status, "rejected");
    assert.equal(summary?.latest_outcome, "Separate reply");
    assert.equal(summary?.latest_call_note, "Reached decision maker");
    assert.equal(summary?.latest_call_outcome, "deal");
    assert.equal(summary?.next_follow_up, "Follow up Friday");
    assert.equal((await detail()).prospect?.next_follow_up, "Follow up Friday");
    await svc.change(owner, { type: "my_board", id, revision: await revision(), enabled: false });
    await svc.change(owner, { type: "my_board", id, revision: await revision(), enabled: true });
    assert.equal((await board()).listing?.cards[0]?.status, "rejected");
    assert.ok((await detail()).timeline.some((e) => e.note === "Prior call"));
    const invited = {
      userId: "Invited",
      displayName: "Invited",
      verifiedEmails: ["viewer@example.invalid"],
    };
    const salesperson = {
      userId: "Salesperson",
      displayName: "Salesperson",
      verifiedEmails: ["salesperson@example.invalid"],
    };
    const browseAs = (p: Actor, boardView = false) =>
      svc.read(p, undefined, 1, "", new URLSearchParams(boardView ? { view: "board" } : {}));
    for (const person of [invited, salesperson]) {
      await svc.change(owner, { type: "invite", email: person.verifiedEmails[0] });
      assert.deepEqual((await browseAs(person)).listing?.cards, []);
      await assert.rejects(svc.read(person, id), /Prospect unavailable/);
    }
    const assigned = randomUUID();
    await svc.change(owner, {
      type: "add",
      record: { id: assigned, name: "Their prospect", details: "" },
    });
    await svc.change(owner, {
      type: "assign",
      id: assigned,
      revision: 0,
      assignee: salesperson.userId,
    });
    await svc.change(salesperson, { type: "my_board", id: assigned, revision: 1, enabled: true });
    for (const useBoard of [false, true]) {
      const otherCards = (await browseAs(salesperson, useBoard)).listing?.cards;
      assert.deepEqual(
        otherCards?.map((card) => card.id),
        [assigned],
      );
      assert.equal(otherCards?.[0]?.latest_call_note, null);
      assert.equal(otherCards?.[0]?.latest_call_outcome, null);
      assert.equal(otherCards?.[0]?.next_follow_up, null);
    }
    await assert.rejects(
      svc.change(salesperson, {
        type: "stage",
        id,
        revision: await revision(),
        status: "negotiating",
      }),
      /Prospect unavailable/,
    );
    await svc.change(owner, {
      type: "assign",
      id,
      revision: await revision(),
      assignee: salesperson.userId,
    });
    const nowVisible = (await svc.read(salesperson, id)).prospect;
    assert.equal(nowVisible?.latest_call_note, "Reached decision maker");
    assert.equal(nowVisible?.latest_call_outcome, "deal");
    assert.equal(nowVisible?.next_follow_up, "Follow up Friday");
    await assert.rejects(svc.read(invited, id), /Prospect unavailable/);
  } finally {
    await sql.close();
  }
});
