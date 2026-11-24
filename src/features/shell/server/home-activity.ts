import "server-only";
import { actor } from "@/features/access/server/auth";
import { adminEmail } from "@/features/access/server/whitelist";
import { database } from "@/server/database/db";
import { homeActivity } from "./home-activity-store";

export async function loadHomeActivity() {
  const person = await actor(true);
  return homeActivity(
    database(),
    () => (process.env.JOBS_DATABASE_URL ? database("jobs") : null),
    person,
    adminEmail(),
  );
}
