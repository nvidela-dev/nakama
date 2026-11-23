"use server";
import { runAction } from "@/features/access/server/action-runner";
import { database } from "@/server/database/db";
import { projectService } from "@/features/projects/server/projects";

export async function navigationProjects() {
  return runAction("project.navigation", async (person) => {
    return projectService(database()).choices(person, { activeOnly: true });
  });
}
