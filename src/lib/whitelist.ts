import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { appAccess, type AllowedEmail, type WhitelistStore } from "./app-access";

export const adminEmail = () => process.env.NAKAMA_ADMIN_EMAIL?.trim().toLowerCase();
export const whitelistStore: WhitelistStore = {
  async list() {
    const client = await clerkClient();
    const entries: AllowedEmail[] = [];
    let offset = 0;
    while (true) {
      const page = await client.allowlistIdentifiers.getAllowlistIdentifierList({ limit: 100, offset });
      entries.push(...page.data.map(({ id, identifier }) => ({ id, identifier })));
      offset += page.data.length;
      if (offset >= page.totalCount) break;
      if (!page.data.length) throw new Error("Incomplete whitelist response");
    }
    return entries;
  },
  async add(identifier) {
    await (await clerkClient()).allowlistIdentifiers.createAllowlistIdentifier({ identifier, notify: false });
  },
  async remove(id) {
    await (await clerkClient()).allowlistIdentifiers.deleteAllowlistIdentifier(id);
  },
};
export const accessPolicy = () => appAccess(whitelistStore, adminEmail());
