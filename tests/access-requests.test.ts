import { required } from "../src/lib/query";
import test from "node:test";
import assert from "node:assert/strict";
import { accessRequests, type AccessRequest } from "../src/lib/access-requests";
import type { AllowedEmail } from "../src/lib/app-access";
const admin = { userId: "admin", verifiedEmails: ["admin@example.com"] };
const member = { userId: "member", verifiedEmails: ["member@example.com"] };
function fixture(failCleanup = false) {
  let requests: AccessRequest[] = [];
  const allowed: AllowedEmail[] = [{ id: "admin", identifier: "admin@example.com" }];
  const policy = accessRequests({
    list: async () => requests,
    create: async (email) => { if (!requests.some((r) => r.email === email)) requests.push({ id: `request-${requests.length}`, email, createdAt: 1 }); },
    remove: async (id) => { if (failCleanup) throw Error("cleanup unavailable"); requests = requests.filter((r) => r.id !== id); },
  }, {
    list: async () => allowed,
    add: async (email) => { allowed.push({ id: email, identifier: email }); },
    remove: async () => {},
  }, "admin@example.com");
  return { policy, allowed };
}
test("requests normalize and deduplicate emails without granting app access", async () => {
  const { policy, allowed } = fixture();
  assert.deepEqual(await policy.submit(" PERSON@EXAMPLE.COM "), { allowed: false });
  await policy.submit("person@example.com");
  assert.equal((await policy.list(admin)).length, 1);
  assert.equal(allowed.length, 1);
  assert.deepEqual(await policy.submit("ADMIN@example.com"), { allowed: true, email: "admin@example.com" });
  await assert.rejects(policy.submit("*@example.com"));
  await assert.rejects(policy.submit("bad email"));
});
test("request reads and approvals require the verified administrator; dismiss does not allow access", async () => {
  const { policy, allowed } = fixture();
  await policy.submit("person@example.com");
  await assert.rejects(policy.list(member));
  await assert.rejects(policy.manage(member, "request-0", "allow"));
  await assert.rejects(policy.manage({ userId: "forged", verifiedEmails: [] }, "request-0", "allow"));
  await assert.rejects(policy.manage(admin, "unknown", "allow"));
  await policy.manage(admin, "request-0", "dismiss");
  assert.equal((await policy.list(admin)).length, 0);
  assert.equal(allowed.length, 1);
  await policy.submit("person@example.com");
  await policy.manage(admin, "request-0", "allow");
  assert.equal(required(allowed[1]).identifier, "person@example.com");
  assert.equal((await policy.list(admin)).length, 0);
});
test("a cleanup failure retains the request but approved emails do not reappear as pending", async () => {
  const { policy, allowed } = fixture(true);
  await policy.submit("person@example.com");
  await assert.rejects(policy.manage(admin, "request-0", "allow"));
  assert.equal(required(allowed[1]).identifier, "person@example.com");
  assert.equal((await policy.list(admin)).length, 0);
});
