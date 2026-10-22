import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { accessRequests, type AccessRequest, type RequestStore } from "./access-requests";
import { adminEmail, whitelistStore } from "./whitelist";

const requestStore: RequestStore = {
  async list() {
    const client = await clerkClient();
    const entries: AccessRequest[] = [];
    let offset = 0;
    while (true) {
      const page = await client.waitlistEntries.list({ status: "pending", limit: 100, offset, orderBy: "-created_at" });
      entries.push(...page.data.map((entry) => ({ id: entry.id, email: entry.emailAddress, createdAt: entry.createdAt })));
      offset += page.data.length;
      if (offset >= page.totalCount) return entries;
      if (!page.data.length) throw new Error("Incomplete access request response");
    }
  },
  async create(emailAddress) { await (await clerkClient()).waitlistEntries.create({ emailAddress, notify: false }); },
  async remove(id) { await (await clerkClient()).waitlistEntries.delete(id); },
};
export const requestPolicy = () => accessRequests(requestStore, whitelistStore, adminEmail());
