import {
  callClerk,
  clerkResponse,
  allowlistPage,
  incompleteClerkPage,
} from "@/server/observability/provider-diagnostics";
import { observeAction } from "@/server/observability/request-observability";
import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import {
  appAccess,
  type AllowedEmail,
  type WhitelistStore,
} from "@/features/access/server/app-access";

export const adminEmail = () => process.env.NAKAMA_ADMIN_EMAIL?.trim().toLowerCase();
export const whitelistStore: WhitelistStore = {
  async list() {
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
  },
  async add(identifier) {
    return observeAction("identity.whitelist.add", async () => {
      const client = await callClerk("client", () => clerkClient());
      await callClerk("allowlist.create", () =>
        client.allowlistIdentifiers.createAllowlistIdentifier({ identifier, notify: false }),
      );
    });
  },
  async remove(id) {
    return observeAction("identity.whitelist.remove", async () => {
      const client = await callClerk("client", () => clerkClient());
      await callClerk("allowlist.delete", () =>
        client.allowlistIdentifiers.deleteAllowlistIdentifier(id),
      );
    });
  },
};
export const accessPolicy = () => appAccess(whitelistStore, adminEmail());
