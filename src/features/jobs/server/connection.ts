import "server-only";
import { z } from "zod";
import { queryRows } from "@/server/database/query";
import { database } from "@/server/database/db";
import { adminActor } from "@/features/access/server/auth";
import { adminEmail } from "@/features/access/server/whitelist";
import { jobsStore } from "./store";
export async function ownerJobs() {
  const owner = await adminActor();
  const db = database("jobs");
  const [schema] = await queryRows(
    db,
    z.object({ ready: z.boolean() }),
    "SELECT to_regclass('nakama_jobs.stage_history') IS NOT NULL AS ready",
  );
  return jobsStore(db, owner, adminEmail(), schema?.ready === true);
}
