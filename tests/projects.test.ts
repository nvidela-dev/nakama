import { required } from "../src/server/database/query";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { projectService, type Actor } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";

const sql = new PGlite();
const db: Database = {
  query: (q, v) => sql.query(q, v),
  transaction: (work) => sql.transaction((tx) => work(tx)),
};
const service = projectService(db);
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
const cara: Actor = {
  userId: "cara",
  verifiedEmails: ["cara@example.com"],
  displayName: "Cara",
};
before(async () => {
  for (const file of (await readdir("migrations")).filter((name) => name.endsWith(".sql")).sort())
    await sql.exec(await readFile(`migrations/${file}`, "utf8"));
});
after(async () => {
  await sql.close();
});

test("capture is atomic, validated, and private across overlapping project groups", async () => {
  await assert.rejects(service.create(alice, { name: "  ", description: "x" }));
  await assert.rejects(service.list({ userId: "", verifiedEmails: [] }));
  const a = await service.create(alice, {
    name: "Radio play",
    description: "Make something fun.",
  });
  const b = await service.create(alice, {
    name: "Tool library",
    description: "Share tools.",
  });
  assert.equal((await service.get(alice, a)).role, "owner");
  assert.deepEqual(await service.list(bob), []);
  await assert.rejects(service.get(bob, a));
  await assert.rejects(service.people(bob, a));
  await assert.rejects(service.get(alice, "bad-id"));
  const inviteA = await service.invite(alice, a, "bob@example.com");
  const inviteB = await service.invite(alice, b, "cara@example.com");
  await service.accept(bob, inviteA.token);
  await service.accept(cara, inviteB.token);
  assert.deepEqual(
    (await service.list(bob)).map((p) => p.id),
    [a],
  );
  assert.deepEqual(
    (await service.list(cara)).map((p) => p.id),
    [b],
  );
  assert.equal(
    (await service.people(alice, a)).members.find((m) => m.user_id === "bob")?.display_name,
    "Bob",
  );
  await assert.rejects(service.get(bob, b));
  await assert.rejects(service.get(cara, a));
  await assert.rejects(service.invite(bob, a, "stranger@example.com"));
  await assert.rejects(service.remove(bob, a, "alice"));
  await service.remove(alice, a, "alice");
  assert.equal((await service.get(alice, a)).role, "owner");
});

test("invitation acceptance requires the intended verified identity, stores only hashes, and is idempotent", async () => {
  const id = await service.create(alice, {
    name: "Secret",
    description: "Private.",
  });
  const invitation = await service.invite(alice, id, "BOB@example.com");
  await assert.rejects(service.accept(cara, invitation.token));
  await assert.rejects(service.accept({ ...bob, verifiedEmails: [] }, invitation.token));
  const stored = (
    await sql.query<{ token_hash: string }>(
      "SELECT token_hash FROM project_invitations WHERE id = $1",
      [invitation.id],
    )
  ).rows[0];
  assert.notEqual(required(stored).token_hash, invitation.token);
  assert.equal(required(stored).token_hash.length, 64);
  assert.equal(await service.accept(bob, invitation.token), id);
  assert.equal(await service.accept(bob, invitation.token), id);
  assert.equal((await service.people(alice, id)).members.length, 2);
  assert.deepEqual((await service.people(bob, id)).invitations, []);
  await service.remove(alice, id, bob.userId);
  await assert.rejects(service.get(bob, id));
  await assert.rejects(service.accept(bob, invitation.token));
});

test("expired, revoked, replaced, and foreign invitations cannot grant access", async () => {
  const a = await service.create(alice, { name: "A", description: "A" });
  const b = await service.create(cara, { name: "B", description: "B" });
  const old = await service.invite(alice, a, "bob@example.com");
  const fresh = await service.invite(alice, a, "bob@example.com");
  await assert.rejects(service.accept(bob, old.token));
  await service.revoke(cara, b, fresh.id); // A foreign ID cannot revoke A's invitation.
  assert.equal(await service.accept(bob, fresh.token), a);
  const revoked = await service.invite(cara, b, "bob@example.com");
  await service.revoke(cara, b, revoked.id);
  await assert.rejects(service.accept(bob, revoked.token));
  const expired = await service.invite(cara, b, "bob@example.com");
  await sql.query(
    "UPDATE project_invitations SET created_at = now() - interval '1 day', expires_at = now() - interval '1 second' WHERE id = $1",
    [expired.id],
  );
  await assert.rejects(service.accept(bob, expired.token));
  await assert.rejects(service.accept(bob, "guess"));
  await assert.rejects(service.revoke(bob, a, fresh.id));
});

test("project and owner membership creation roll back together", async () => {
  const broken: Database = {
    ...db,
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          query: (q, v) => {
            if (q.includes("INSERT INTO project_memberships"))
              throw new Error("simulated membership failure");
            return tx.query(q, v);
          },
        }),
      ),
  };
  await assert.rejects(
    projectService(broken).create(alice, {
      name: "Never partially saved",
      description: "Test rollback.",
    }),
  );
  const rows = await sql.query("SELECT id FROM projects WHERE name = 'Never partially saved'");
  assert.equal(rows.rows.length, 0);
});

test("removing a member revokes older unused invitations for their joining email", async () => {
  const id = await service.create(alice, {
    name: "Removal boundary",
    description: "Old links cannot undo removal.",
  });
  const accepted = await service.invite(alice, id, "bob@example.com");
  await service.accept(bob, accepted.token);
  const unused = await service.invite(alice, id, "bob@example.com");
  await service.remove(alice, id, "bob");
  await assert.rejects(service.accept(bob, unused.token));
  const invitedAgain = await service.invite(alice, id, "bob@example.com");
  assert.equal(await service.accept(bob, invitedAgain.token), id);
});

test("workspace uses one checkout and one membership lock across its readers", async () => {
  const { loadWorkspace } = await import("../src/app/projects/[projectId]/workspace");
  const id = await service.create(alice, { name: "Workspace fixture", description: "Synthetic" });
  const privateId = await service.create(cara, { name: "Unrelated", description: "Synthetic" });
  let transactions = 0;
  const statements: string[] = [];
  const counted: Database = {
    query: () => {
      throw new Error("workspace used a second connection");
    },
    transaction: (read) => {
      transactions++;
      return db.transaction((tx) =>
        read({
          query: (q, v) => {
            statements.push(q);
            return tx.query(q, v);
          },
        }),
      );
    },
  };
  const options = { target: {}, focusedWork: false, activityView: false };
  const result = await loadWorkspace(counted, alice, id, options);
  assert.equal(result.project.role, "owner");
  assert.equal(transactions, 1);
  assert.equal(
    statements.filter((q) => q.includes("SELECT role FROM project_memberships")).length,
    1,
  );
  assert.ok(!result.accessibleProjects.some((p) => p.id === privateId));
  assert.equal(result.tasks, null);
  assert.equal(result.artifacts, null);
  assert.ok(!statements.some((q) => /FROM project_tasks|FROM project_artifacts/.test(q)));
  const board = await loadWorkspace(counted, alice, id, {
    ...options,
    view: "tasks",
    focusedWork: true,
  });
  assert.ok(board.tasks);
  assert.equal(board.artifacts, null);
  const library = await loadWorkspace(counted, alice, id, { ...options, view: "artifacts" });
  assert.ok(library.artifacts);
  assert.equal(library.tasks, null);
  statements.length = 0;
  await assert.rejects(loadWorkspace(counted, bob, id, options));
  assert.equal(statements.length, 1);
  const focused = await loadWorkspace(counted, alice, id, {
    ...options,
    focusedWork: true,
    activityView: true,
  });
  assert.deepEqual(focused.accessibleProjects, []);
  assert.ok(focused.activity.items.length > 0);
});

test("owners can archive and restore a project without losing access, content, or history", async () => {
  const owner = { userId: "archive-owner", verifiedEmails: [] };
  const member = { userId: "archive-member", verifiedEmails: ["archive@example.com"] };
  const id = await service.create(owner, { name: "Keep for later", description: "Original work" });
  const invite = await service.invite(owner, id, "archive@example.com");
  await service.accept(member, invite.token);
  await assert.rejects(service.setArchived(member, id, true), /access/);
  await assert.rejects(service.setArchived(cara, id, true), /access/);
  await service.setArchived(owner, id, true);
  await service.setArchived(owner, id, true);
  assert.equal((await service.get(member, id)).description, "Original work");
  assert.equal((await service.get(member, id)).archived, true);
  assert.deepEqual((await service.page(member)).items, []);
  assert.deepEqual(await service.groupCounts(member), []);
  assert.deepEqual(await service.choices(member, { activeOnly: true }), []);
  assert.equal((await service.choices(member))[0]?.id, id);
  assert.equal((await service.page(member, undefined, true)).items[0]?.id, id);
  assert.deepEqual(await service.groupCounts(member, true), [{ flow_id: null, total: 1 }]);
  assert.ok(!(await service.page(cara, undefined, true)).items.some((p) => p.id === id));
  await assert.rejects(service.setArchived(member, id, false), /access/);
  await service.setArchived(owner, id, false);
  await service.setArchived(owner, id, false);
  assert.equal((await service.page(member)).items[0]?.id, id);
  assert.deepEqual((await service.page(member, undefined, true)).items, []);
  assert.equal((await service.choices(member, { activeOnly: true }))[0]?.id, id);
  const events = await sql.query(
    "SELECT kind FROM project_activity WHERE project_id=$1 AND kind IN ('project_archived','project_restored') ORDER BY kind",
    [id],
  );
  assert.deepEqual(events.rows, [{ kind: "project_archived" }, { kind: "project_restored" }]);
});

test("dashboard pagination handles timestamp ties and scopes totals and card queries", async () => {
  const { projectProgress, projectActivityCounts } =
    await import("../src/features/projects/server/project-progress");
  const viewer = { userId: "dashboard-fixture", verifiedEmails: [] };
  const ids = [];
  for (let i = 0; i < 26; i++)
    ids.push(await service.create(viewer, { name: "Card " + i, description: "Synthetic" }));
  await db.query(
    "UPDATE projects SET created_at='2026-01-01 00:00:00.123456+00' WHERE id=ANY($1::uuid[])",
    [ids],
  );
  const first = await service.page(viewer);
  assert.equal(first.items.length, 24);
  const second = await service.page(viewer, required(first.next ?? undefined));
  assert.equal(second.next, null);
  assert.deepEqual(
    [...first.items, ...second.items].map((p) => p.id),
    ids.sort(),
  );
  assert.deepEqual(await service.groupCounts(viewer), [{ flow_id: null, total: 26 }]);
  const other = await service.create(cara, { name: "Hidden card", description: "Synthetic" });
  assert.equal((await projectProgress(db, viewer, [other])).size, 0);
  assert.deepEqual(
    [...(await projectActivityCounts(db, viewer, [ids[0]!, other])).keys()],
    [ids[0]],
  );
  await assert.rejects(service.page(viewer, "broken"), /Invalid page link/);
});

test("only the project owner can save or clear a direct, revision-checked Linear project link", async () => {
  const id = await service.create(alice, {
    name: "Linked workspace",
    description: "External project link test",
  });
  const url = "https://linear.app/example/project/sample-project";
  await service.saveLinearLink(alice, id, 0, url);
  assert.equal((await service.get(alice, id)).linear_project_url, url);
  await assert.rejects(service.saveLinearLink(cara, id, 1, ""));
  await assert.rejects(
    service.saveLinearLink(alice, id, 1, "https://linear.app/example/issue/X-1"),
  );
  await assert.rejects(service.saveLinearLink(alice, id, 0, ""));
  await service.saveLinearLink(alice, id, 1, "");
  assert.equal((await service.get(alice, id)).linear_project_url, null);
});
