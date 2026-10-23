"use server";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError, projectService } from "@/features/projects/server/projects";
import type { ActionState } from "@/shared/contracts/action-state";
const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const message = (error: unknown) =>
  error instanceof ProjectError
    ? error.message
    : "We could not save this. Please try again; your draft is still here.";
import { invitationCandidates } from "./server/invitation-candidates";
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
      const { token } = await projectService(database()).invite(person, projectId, email);
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
export async function acceptInvitation(_state: ActionState, data: FormData): Promise<ActionState> {
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
