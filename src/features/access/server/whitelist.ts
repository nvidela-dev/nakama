import {
  callClerk,
  clerkResponse,
  allowlistPage,
  incompleteClerkPage,
} from "@/server/observability/provider-diagnostics";
import { observeAction } from "@/server/observability/request-observability";
import "server-only";
import { pendingReads } from "./pending-reads";
import { clerkClient } from "@clerk/nextjs/server";
import {
  appAccess,
  type AllowedEmail,
  type WhitelistStore,
} from "@/features/access/server/app-access";

export const adminEmail = () => process.env.NAKAMA_ADMIN_EMAIL?.trim().toLowerCase();
const lists = pendingReads<void, AllowedEmail[]>(async () => {
  return observeAction("identity.whitelist.list", async () => {
    const client = await callClerk("client", () => clerkClient());
    const entries: AllowedEmail[] = [];
    let offset = 0;
    while (true) {
      const page = clerkResponse(
        "allowlist.list",
        allowlistPage,
        await callClerk("allowlist.list", () =>
          client.allowlistIdentifiers.getAllowlistIdentifierList({ limit: 100, offset }),
        ),
      );
      entries.push(...page.data.map(({ id, identifier }) => ({ id, identifier })));
      offset += page.data.length;
      if (offset >= page.totalCount) break;
      if (!page.data.length) incompleteClerkPage("allowlist.list");
    }
    return entries;
  });
});
export const whitelistStore: WhitelistStore = {
  list: () => lists.get(),
  async add(identifier) {
    try {
      await observeAction("identity.whitelist.add", async () => {
        const client = await callClerk("client", () => clerkClient());
        await callClerk("allowlist.create", () =>
          client.allowlistIdentifiers.createAllowlistIdentifier({ identifier, notify: false }),
        );
      });
    } finally {
      lists.invalidate();
    }
  },
  async remove(id) {
    try {
      await observeAction("identity.whitelist.remove", async () => {
        const client = await callClerk("client", () => clerkClient());
        await callClerk("allowlist.delete", () =>
          client.allowlistIdentifiers.deleteAllowlistIdentifier(id),
        );
      });
    } finally {
      lists.invalidate();
    }
  },
};
export const accessPolicy = () => appAccess(whitelistStore, adminEmail());
