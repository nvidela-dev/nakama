import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { projectService, type Actor } from "../src/lib/projects";
import type { Database } from "../src/lib/database";

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
  for (const file of ["001_private_projects.sql", "002_guided_flows.sql"])
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
    (await service.people(alice, a)).members.find((m) => m.user_id === "bob")
      ?.display_name,
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
  await assert.rejects(
    service.accept({ ...bob, verifiedEmails: [] }, invitation.token),
  );
  const stored = (
    await sql.query<{ token_hash: string }>(
      "SELECT token_hash FROM project_invitations WHERE id = $1",
      [invitation.id],
    )
  ).rows[0];
  assert.notEqual(stored.token_hash, invitation.token);
  assert.equal(stored.token_hash.length, 64);
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
    "UPDATE project_invitations SET expires_at = now() - interval '1 second' WHERE id = $1",
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
  const rows = await sql.query(
    "SELECT id FROM projects WHERE name = 'Never partially saved'",
  );
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
