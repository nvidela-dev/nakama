import { observeAction } from "@/server/observability/request-observability";
import "server-only";
import {
  callClerk,
  clerkResponse,
  protectedIdentity,
  currentIdentityWithId,
} from "@/server/observability/provider-diagnostics";
import { cache } from "react";
import { pendingReads } from "./pending-reads";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { accessPolicy, adminEmail } from "@/features/access/server/whitelist";
import { isAppAdmin } from "@/features/access/server/app-access";
import type { Actor } from "@/shared/contracts/actor";
import { authConfigured } from "@/server/auth-config";
export { authConfigured } from "@/server/auth-config";
export const currentProfile = cache(async () =>
  clerkResponse(
    "user.current",
    currentIdentityWithId,
    await callClerk("user.current", () => currentUser()),
  ),
);
const profiles = pendingReads(async (userId: string) => {
  const user = await currentProfile();
  if (!user || user.id !== userId) redirect("/access-required");
  return user;
});
const admittedActor = cache(async (): Promise<Actor> => {
  return observeAction("auth.actor", async () => {
    const { userId } = clerkResponse(
      "auth.protect",
      protectedIdentity,
      await callClerk("auth.protect", () => auth.protect()),
    );
    const user = await profiles.get(userId);
    const person: Actor = {
      userId,
      displayName:
        user.fullName ||
        user.username ||
        user.primaryEmailAddress?.emailAddress.split("@")[0] ||
        "Crew member",
      verifiedEmails:
        user.emailAddresses
          ?.filter((e) => e.verification?.status === "verified")
          .map((e) => e.emailAddress) ?? [],
    };
    if (!(await accessPolicy().admitted(person))) redirect("/access-required");
    return person;
  });
});
export async function actor(includeEmails = false): Promise<Actor> {
  const person = await admittedActor();
  return includeEmails ? person : { ...person, verifiedEmails: [] };
}
export async function adminActor(): Promise<Actor> {
  return observeAction("auth.admin", async () => {
    const person = await actor(true);
    if (!isAppAdmin(person, adminEmail())) notFound();
    return person;
  });
}

export const currentIsAdmin = cache(async () => {
  if (!authConfigured() || !(await auth()).userId) return false;
  const user = await currentProfile();
  return (
    !!user &&
    isAppAdmin(
      {
        userId: user.id,
        verifiedEmails: user.emailAddresses
          .filter((email) => email.verification?.status === "verified")
          .map((email) => email.emailAddress),
      },
      adminEmail(),
    )
  );
});
