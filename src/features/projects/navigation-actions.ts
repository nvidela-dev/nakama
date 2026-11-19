"use server";
import { observeAction } from "@/server/observability/request-observability";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { projectService } from "@/features/projects/server/projects";

export async function navigationProjects() {
  return observeAction("project.navigation", async () => {
    const person = await actor();
    return projectService(database()).choices(person, { activeOnly: true });
  });
}
