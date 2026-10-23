import { callClerk, clerkResponse, waitlistPage, incompleteClerkPage } from "./provider-diagnostics";
import { observeAction } from "./request-observability";
import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { accessRequests, type AccessRequest, type RequestStore } from "./access-requests";
import { adminEmail, whitelistStore } from "./whitelist";

const requestStore: RequestStore = {
  async list() {
    return observeAction("identity.requests.list", async () => {
      const client = await callClerk("client", () => clerkClient());
      const entries: AccessRequest[] = [];
      let offset = 0;
      while (true) {
        const page = clerkResponse("waitlist.list", waitlistPage, await callClerk("waitlist.list", () => client.waitlistEntries.list({ status: "pending", limit: 100, offset, orderBy: "-created_at" })));
        entries.push(...page.data.map((entry) => ({ id: entry.id, email: entry.emailAddress, createdAt: entry.createdAt })));
        offset += page.data.length;
        if (offset >= page.totalCount) return entries;
        if (!page.data.length) incompleteClerkPage("waitlist.list");
      }
    });
  },
  async create(emailAddress) {
    return observeAction("identity.requests.create", async () => {
      const client = await callClerk("client", () => clerkClient());
      await callClerk("waitlist.create", () => client.waitlistEntries.create({ emailAddress, notify: false }));
    });
  },
  async remove(id) {
    return observeAction("identity.requests.remove", async () => {
      const client = await callClerk("client", () => clerkClient());
      await callClerk("waitlist.delete", () => client.waitlistEntries.delete(id));
    });
  },
};
export const requestPolicy = () => accessRequests(requestStore, whitelistStore, adminEmail());
