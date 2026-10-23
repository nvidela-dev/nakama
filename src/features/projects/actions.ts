"use server";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError, projectService } from "@/features/projects/server/projects";
import { projectLinksService } from "@/features/projects/server/project-links";
import { startProject } from "@/features/projects/server/project-start";
import { guidanceService } from "@/features/guidance/server/guidance";
import type { ActionState } from "@/shared/contracts/action-state";
const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const message = (error: unknown) =>
  error instanceof ProjectError
    ? error.message
    : "We could not save this. Please try again; your draft is still here.";
export async function createProject(_state: ActionState, data: FormData): Promise<ActionState> {
  return observeAction("project.create", async () => {
    const person = await actor();
    let id: string;
    try {
      id = await startProject(database(), person, {
        name: field(data, "name"),
        description: field(data, "description"),
        flow: field(data, "flow"),
        sourceIds: data.getAll("sourceIds"),
      });
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
    revalidatePath("/projects", "layout");
    redirect(`/projects/${id}`);
  });
}
export async function editProject(
  projectId: string,
  expected: { name: string; description: string; contentRevision: number },
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("project.edit", async () => {
    const person = await actor();
    try {
      await guidanceService(database()).editProject(
        person,
        projectId,
        {
          name: field(data, "name"),
          description: field(data, "description"),
        },
        expected,
      );
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { success: "Project updated." };
  });
}
export async function deleteProject(
  projectId: string,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("project.delete", async () => {
    const person = await actor();
    try {
      await projectService(database()).deleteProject(
        person,
        projectId,
        field(data, "confirmation"),
      );
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    redirect("/projects");
  });
}

export async function changeProjectLink(
  projectId: string,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("project.link", async () => {
    const person = await actor();
    const otherId = field(data, "otherId"),
      direction = field(data, "direction");
    if (direction !== "source" && direction !== "child")
      return { error: "Choose a relationship direction." };
    const [sourceId, childId] =
      direction === "source" ? [otherId, projectId] : [projectId, otherId];
    try {
      await projectLinksService(database()).change(
        person,
        sourceId,
        childId,
        field(data, "operation") === "remove",
      );
      revalidatePath(`/projects/${projectId}`);
      revalidatePath(`/projects/${otherId}`);
      return { success: "Project links updated." };
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
  });
}
