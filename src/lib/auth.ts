import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Actor } from "./projects";
export const authConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
export async function actor(includeEmails = false): Promise<Actor> {
  const { userId } = await auth.protect();
  const user = await currentUser();
  return {
    userId,
    displayName: user?.fullName || user?.username || "Crew member",
    verifiedEmails:
      (includeEmails ? user?.emailAddresses : [])
        ?.filter((e) => e.verification?.status === "verified")
        .map((e) => e.emailAddress) ?? [],
  };
}
