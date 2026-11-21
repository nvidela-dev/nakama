import "server-only";
import { database } from "@/server/database/db";
import { adminActor } from "@/features/access/server/auth";
import { adminEmail } from "@/features/access/server/whitelist";
import { jobsStore } from "./store";
export async function ownerJobs() {
  const owner = await adminActor();
  return jobsStore(database("jobs"), owner, adminEmail());
}
