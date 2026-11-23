"use server";
import { runAction } from "@/features/access/server/action-runner";
import { telemetry } from "@/server/observability/observability";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
import { projectService } from "@/features/projects/server/projects";
import { projectLinksService } from "@/features/projects/server/project-links";
import { startProject } from "@/features/projects/server/project-start";
import { guidanceService } from "@/features/guidance/server/guidance";
import type { ActionState } from "@/shared/contracts/action-state";
import { field } from "@/server/actions/form";
const message = (error: unknown) =>
  error instanceof ProjectError
    ? error.message
    : "We could not save this. Please try again; your draft is still here.";
export async function createProject(_state: ActionState, data: FormData): Promise<ActionState> {
  return runAction("project.create", async (person) => {
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
  return runAction("project.edit", async (person) => {
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
export async function setProjectArchived(
  projectId: string,
  archived: boolean,
): Promise<ActionState> {
  return runAction("project.archive", async (person) => {
    try {
      if (typeof archived !== "boolean") throw new ProjectError("Invalid archive action.");
      await projectService(database()).setArchived(person, projectId, archived);
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
    revalidatePath("/projects", "layout");
    return { success: archived ? "Project archived." : "Project restored." };
  });
}

export async function deleteProject(
  projectId: string,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return runAction("project.delete", async (person) => {
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
  return runAction("project.link", async (person) => {
    const otherId = field(data, "otherId"),
      direction = field(data, "direction");
    try {
      await projectLinksService(database()).changeRelative(
        person,
        projectId,
        otherId,
        direction,
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

export async function saveProjectLinearLink(
  projectId: string,
  revision: number,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  return runAction("project.edit", async (person) => {
    try {
      await projectService(database()).saveLinearLink(
        person,
        projectId,
        revision,
        field(form, "url"),
      );
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
    revalidatePath(`/projects/${projectId}`);
    return { success: "Saved." };
  });
}
