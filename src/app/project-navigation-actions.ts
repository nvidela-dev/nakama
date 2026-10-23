"use server";
import { observeAction } from "@/lib/request-observability";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { projectService } from "@/lib/projects";

export async function navigationProjects() {
  return observeAction("project.navigation", async () => {
    const person = await actor();
    const projects = await projectService(database()).list(person);
    return projects.map(({ id, name }) => ({ id, name }));
  });
}
