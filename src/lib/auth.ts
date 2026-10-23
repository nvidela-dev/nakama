import { observeAction } from "@/lib/request-observability";
import "server-only";
import { callClerk, clerkResponse, protectedIdentity, currentIdentity } from "./provider-diagnostics";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { accessPolicy, adminEmail } from "./whitelist";
import { isAppAdmin } from "./app-access";
import type { Actor } from "./projects";
export const authConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
  );
export async function actor(includeEmails = false): Promise<Actor> {
  return observeAction("auth.actor", async () => {
    const { userId } = clerkResponse("auth.protect", protectedIdentity, await callClerk("auth.protect", () => auth.protect()));
    const user = clerkResponse("user.current", currentIdentity, await callClerk("user.current", () => currentUser()));
    const person: Actor = {
      userId,
      displayName:
        user?.fullName ||
        user?.username ||
        user?.primaryEmailAddress?.emailAddress.split("@")[0] ||
        "Crew member",
      verifiedEmails:
        user?.emailAddresses
          ?.filter((e) => e.verification?.status === "verified")
          .map((e) => e.emailAddress) ?? [],
    };
    if (!(await accessPolicy().admitted(person))) redirect("/access-required");
    return { ...person, verifiedEmails: includeEmails ? person.verifiedEmails : [] };
  });
}
export async function adminActor(): Promise<Actor> {
  return observeAction("auth.admin", async () => {
    const person = await actor(true);
    if (!isAppAdmin(person, adminEmail())) notFound();
    return person;
  });
}
