import "server-only";
import { cache } from "react";
import { actor, currentAdmittedActor } from "@/features/access/server/auth";
import { adminEmail } from "@/features/access/server/whitelist";
import { database } from "@/server/database/db";
import type { Actor } from "@/shared/contracts/actor";
import { homeActivity } from "./home-activity-store";
import { homeMetrics } from "./home-metrics";

const jobs = () => (process.env.JOBS_DATABASE_URL ? database("jobs") : null);

// The auth layer gives both consumers the same admitted Actor within the render.
// React's cache shares its counts without persisting them across requests.
const workspaceMetrics = cache((person: Actor) =>
  homeMetrics(database(), jobs, person, adminEmail()),
);

export async function loadWorkspaceMetrics() {
  const person = await currentAdmittedActor();
  return person ? workspaceMetrics(person) : null;
}

export async function loadHomeSnapshot() {
  const person = await actor(true);
  const [activity, metrics] = await Promise.all([
    homeActivity(database(), jobs, person, adminEmail()),
    workspaceMetrics(person),
  ]);
  return { activity, metrics };
}
