import test from "node:test";
import assert from "node:assert/strict";
import {
  appAccess,
  isAppAdmin,
  type AllowedEmail,
  type WhitelistStore,
} from "../src/features/access/server/app-access";
import type { Actor } from "../src/features/projects/server/projects";
const admin: Actor = { userId: "admin", verifiedEmails: [" Admin@example.com "] };
const friend: Actor = { userId: "friend", verifiedEmails: ["friend@example.com"] };
const outsider: Actor = { userId: "other", verifiedEmails: ["other@example.com"] };
function fixture() {
  let entries: AllowedEmail[] = [{ id: "admin-entry", identifier: "admin@example.com" }];
  const store: WhitelistStore = {
    list: async () => entries.map((entry) => ({ ...entry })),
    add: async (identifier) => {
      entries.push({ id: `entry-${entries.length}`, identifier });
    },
    remove: async (id) => {
      entries = entries.filter((entry) => entry.id !== id);
    },
  };
  return appAccess(store, "admin@example.com");
}
test("app admission requires a verified whitelisted email and fails closed without configuration", async () => {
  const policy = fixture();
  assert.ok(isAppAdmin(admin, "admin@example.com"));
  assert.equal(isAppAdmin({ userId: "forged", verifiedEmails: [] }, "admin@example.com"), false);
  assert.ok(await policy.admitted(admin));
  assert.equal(await policy.admitted(friend), false);
  await policy.add(admin, " FRIEND@EXAMPLE.COM ");
  assert.ok(await policy.admitted(friend));
  assert.equal(await policy.admitted({ userId: "unverified", verifiedEmails: [] }), false);
  assert.equal(await policy.admitted({ userId: "", verifiedEmails: ["admin@example.com"] }), false);
  assert.equal(
    await appAccess({ list: async () => [], add: async () => {}, remove: async () => {} }).admitted(
      admin,
    ),
    false,
  );
});
test("only the administrator can read or change whitelist and cannot remove themselves", async () => {
  const policy = fixture();
  for (const person of [friend, outsider, { userId: "removed", verifiedEmails: [] }]) {
    await assert.rejects(policy.list(person));
    await assert.rejects(policy.add(person, "new@example.com"));
    await assert.rejects(policy.remove(person, "admin-entry"));
  }
  await assert.rejects(policy.remove(admin, "admin-entry"));
  await assert.rejects(policy.add(admin, "*@example.com"));
  await assert.rejects(policy.add(admin, "not an email"));
  await assert.rejects(policy.add(admin, "+15555555555"));
  await policy.add(admin, "friend@example.com");
  await policy.add(admin, "FRIEND@example.com");
  assert.equal((await policy.list(admin)).length, 2);
  const entry = (await policy.list(admin)).find(
    (entry) => entry.identifier === "friend@example.com",
  )!;
  await policy.remove(admin, entry.id);
  assert.equal(await policy.admitted(friend), false);
  await assert.rejects(policy.remove(admin, "missing"));
});
test("provider failures never grant access to an ordinary account", async () => {
  const policy = appAccess(
    {
      list: async () => {
        throw Error("unavailable");
      },
      add: async () => {},
      remove: async () => {},
    },
    "admin@example.com",
  );
  await assert.rejects(policy.admitted(friend));
  assert.ok(await policy.admitted(admin));
});

test("overlapping reads share work only within a key and invalidation survives late completion", async () => {
  const { pendingReads } = await import("../src/features/access/server/pending-reads");
  const completions: ((value: number) => void)[] = [];
  const reads = pendingReads(
    (_: string) => new Promise<number>((resolve) => completions.push(resolve)),
  );
  const old = reads.get("a");
  assert.equal(reads.get("a"), old);
  const other = reads.get("b");
  reads.invalidate("a");
  const fresh = reads.get("a");
  completions[0]!(1);
  assert.equal(await old, 1);
  assert.equal(reads.get("a"), fresh);
  completions[1]!(2);
  completions[2]!(3);
  assert.deepEqual(await Promise.all([other, fresh]), [2, 3]);
  assert.notEqual(reads.get("a"), fresh);
  completions[3]!(4);
  const failures = pendingReads(async () => {
    throw new Error("unavailable");
  });
  const first = failures.get(undefined);
  await assert.rejects(first);
  const retry = failures.get(undefined);
  assert.notEqual(first, retry);
  await assert.rejects(retry);
});
