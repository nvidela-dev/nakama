import { z } from "zod";
import { ProjectError, type Actor } from "./projects";

export type AllowedEmail = { id: string; identifier: string };
export type WhitelistStore = {
  list(): Promise<AllowedEmail[]>;
  add(email: string): Promise<void>;
  remove(id: string): Promise<void>;
};
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function isAppAdmin(person: Actor, adminEmail?: string) {
  return !!person.userId && !!adminEmail && person.verifiedEmails.some((email) => normalizeEmail(email) === normalizeEmail(adminEmail));
}
export function appAccess(store: WhitelistStore, adminEmail?: string) {
  function requireAdmin(person: Actor) {
    if (!isAppAdmin(person, adminEmail)) throw new ProjectError("Administrator access required.");
  }
  return {
    async admitted(person: Actor) {
      if (!person.userId || !adminEmail) return false;
      if (isAppAdmin(person, adminEmail)) return true;
      const emails = new Set(person.verifiedEmails.map(normalizeEmail));
      if (!emails.size) return false;
      return (await store.list()).some((entry) => emails.has(normalizeEmail(entry.identifier)));
    },
    async list(person: Actor) { requireAdmin(person); return store.list(); },
    async add(person: Actor, input: string) {
      requireAdmin(person);
      const email = normalizeEmail(input);
      if (!z.email().max(254).safeParse(email).success || email.includes("*"))
        throw new ProjectError("Enter one valid email address. Wildcards are not allowed.");
      if ((await store.list()).some((entry) => normalizeEmail(entry.identifier) === email)) return;
      await store.add(email);
    },
    async remove(person: Actor, id: string) {
      requireAdmin(person);
      const entry = (await store.list()).find((entry) => entry.id === id);
      if (!entry) throw new ProjectError("Whitelist entry not found.");
      if (normalizeEmail(entry.identifier) === normalizeEmail(adminEmail!))
        throw new ProjectError("The administrator cannot be removed from the whitelist.");
      await store.remove(id);
    },
  };
}
