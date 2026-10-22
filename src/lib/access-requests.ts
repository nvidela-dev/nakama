import { z } from "zod";
import { appAccess, isAppAdmin, normalizeEmail, type WhitelistStore } from "./app-access";
import { ProjectError, type Actor } from "./projects";
export type AccessRequest = { id: string; email: string; createdAt: number };
export type RequestStore = {
  list(): Promise<AccessRequest[]>;
  create(email: string): Promise<void>;
  remove(id: string): Promise<void>;
};
export function accessRequests(store: RequestStore, whitelist: WhitelistStore, adminEmail?: string) {
  function requireAdmin(person: Actor) {
    if (!isAppAdmin(person, adminEmail)) throw new ProjectError("Administrator access required.");
  }
  return {
    async submit(input: string) {
      const email = normalizeEmail(input);
      if (!adminEmail) throw new ProjectError("Access requests are unavailable. Please try again later.");
      if (!z.email().max(254).safeParse(email).success || email.includes("*"))
        throw new ProjectError("Enter one valid email address. Wildcards are not allowed.");
      if ((await whitelist.list()).some((entry) => normalizeEmail(entry.identifier) === email))
        return { allowed: true as const, email };
      await store.create(email);
      return { allowed: false as const };
    },
    async list(person: Actor) {
      requireAdmin(person);
      const [requests, allowed] = await Promise.all([store.list(), whitelist.list()]);
      const emails = new Set(allowed.map((entry) => normalizeEmail(entry.identifier)));
      return requests.filter((request) => !emails.has(normalizeEmail(request.email)));
    },
    async manage(person: Actor, id: string, operation: "allow" | "dismiss") {
      requireAdmin(person);
      const request = (await store.list()).find((request) => request.id === id);
      if (!request) throw new ProjectError("Access request not found. Refresh the list.");
      if (operation === "allow") await appAccess(whitelist, adminEmail).add(person, request.email);
      // Allowlisting happens first: a cleanup failure never loses an unapproved request.
      // Already-allowed entries are filtered from the pending list on the next read.
      await store.remove(id);
    },
  };
}
