"use server";
import { runAction } from "@/features/access/server/action-runner";
import { telemetry } from "@/server/observability/observability";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
import { projectService } from "@/features/projects/server/projects";
import type { InviteActionState } from "./model";
import type { ActionState } from "@/shared/contracts/action-state";
import { field } from "@/server/actions/form";
import { issueApprovedInvitation } from "./server/invitation-candidates";
const message = (error: unknown) =>
  error instanceof ProjectError
    ? error.message
    : "We could not save this. Please try again; your draft is still here.";
export async function invitePerson(
  projectId: string,
  _state: ActionState,
  data: FormData,
): Promise<InviteActionState> {
  return runAction("invitation.create", async (person) => {
    try {
      const { token } = await issueApprovedInvitation(person, projectId, field(data, "email"));
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
  return runAction("project.members.manage", async (person) => {
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
  return runAction(
    "invitation.accept",
    async (person) => {
      let id: string;
      try {
        id = await projectService(database()).accept(person, field(data, "token"));
      } catch (error) {
        telemetry.reportError(error);
        return { error: message(error) };
      }
      revalidatePath("/projects");
      redirect(`/projects/${id}`);
    },
    true,
  );
}
