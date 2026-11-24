import "server-only";
import { actor } from "@/features/access/server/auth";
import { adminEmail } from "@/features/access/server/whitelist";
import { database } from "@/server/database/db";
import { homeActivity } from "./home-activity-store";
import { homeMetrics } from "./home-metrics";

export async function loadHomeSnapshot() {
  const person = await actor(true);
  const workspace = database();
  const jobs = () => (process.env.JOBS_DATABASE_URL ? database("jobs") : null);
  const owner = adminEmail();
  const [activity, metrics] = await Promise.all([
    homeActivity(workspace, jobs, person, owner),
    homeMetrics(workspace, jobs, person, owner),
  ]);
  return { activity, metrics };
}
