"use server";
import { observeAction } from "@/lib/request-observability";
import { telemetry } from "@/lib/observability";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { invitationCandidates } from "@/lib/invitation-candidates";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { ProjectError, projectService } from "@/lib/projects";
import { projectLinksService } from "@/lib/project-links";
import { startProject } from "@/lib/project-start";
import { guidanceService } from "@/lib/guidance";
export type ActionState = { error?: string; token?: string; success?: string };
const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const message = (error: unknown) =>
  error instanceof ProjectError
    ? error.message
    : "We could not save this. Please try again; your draft is still here.";
export async function createProject(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
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
export async function invitePerson(
  projectId: string,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("invitation.create", async () => {
    const person = await actor();
    try {
      const email = field(data, "email").trim().toLowerCase();
      if (!(await invitationCandidates(person, projectId)).includes(email))
        throw new ProjectError("Choose an approved person who is not already a project member.");
      const { token } = await projectService(database()).invite(
        person,
        projectId,
        email,
      );
      revalidatePath(`/projects/${projectId}`);
      return {
        token,
        success: "Invitation ready. Share the link with the person you invited.",
      };
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
  });
}
export async function managePerson(
  projectId: string,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("project.members.manage", async () => {
    const person = await actor();
    try {
      const service = projectService(database());
      if (field(data, "operation") === "revoke")
        await service.revoke(person, projectId, field(data, "id"));
      else if (field(data, "operation") === "remove")
        await service.remove(person, projectId, field(data, "id"));
      else throw new ProjectError("Unknown action.");
      revalidatePath(`/projects/${projectId}`);
      return { success: "Access updated." };
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
  });
}
export async function acceptInvitation(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("invitation.accept", async () => {
    const person = await actor(true);
    let id: string;
    try {
      id = await projectService(database()).accept(person, field(data, "token"));
    } catch (error) {
      telemetry.reportError(error);
      return { error: message(error) };
    }
    revalidatePath("/projects");
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
      await guidanceService(database()).editProject(person, projectId, {
        name: field(data, "name"), description: field(data, "description"),
      }, expected);
    } catch (error) {
      telemetry.reportError(error); return { error: message(error) };
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
      await projectService(database()).deleteProject(person, projectId, field(data, "confirmation"));
    } catch (error) {
      telemetry.reportError(error); return { error: message(error) };
    }
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    redirect("/projects");
  });
}

export async function changeProjectLink(projectId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return observeAction("project.link", async () => {
    const person = await actor();
    const otherId = field(data, "otherId"), direction = field(data, "direction");
    if (direction !== "source" && direction !== "child") return { error: "Choose a relationship direction." };
    const [sourceId, childId] = direction === "source" ? [otherId, projectId] : [projectId, otherId];
    try {
      await projectLinksService(database()).change(person, sourceId, childId, field(data, "operation") === "remove");
      revalidatePath(`/projects/${projectId}`);
      revalidatePath(`/projects/${otherId}`);
      return { success: "Project links updated." };
    } catch (error) {
      telemetry.reportError(error); return { error: message(error) };
    }
  });
}
