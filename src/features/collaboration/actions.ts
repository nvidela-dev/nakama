"use server";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";

import { revalidatePath } from "next/cache";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import {
  collaborationService,
  type CommentTarget,
} from "@/features/collaboration/server/collaboration";
import { ProjectError } from "@/features/projects/server/projects";
import type { ActionState } from "@/shared/contracts/action-state";
const errorMessage = (error: unknown) =>
  error instanceof ProjectError
    ? error.message
    : "Could not save the comment. Your draft is still here.";
export async function postComment(
  projectId: string,
  target: CommentTarget,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("comment.post", async () => {
    const person = await actor();
    try {
      await collaborationService(database()).post(
        person,
        projectId,
        target,
        String(data.get("content") ?? ""),
      );
    } catch (error) {
      telemetry.reportError(error);
      return { error: errorMessage(error) };
    }
    revalidatePath(`/projects/${projectId}`);
    return { success: "Comment posted." };
  });
}
export async function changeComment(
  projectId: string,
  id: string,
  revision: number,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("comment.change", async () => {
    const person = await actor();
    const operation = String(data.get("operation") ?? "");
    try {
      if (operation !== "edit" && operation !== "delete") throw new ProjectError("Unknown action.");
      await collaborationService(database()).change(
        person,
        projectId,
        id,
        revision,
        operation,
        String(data.get("content") ?? ""),
      );
    } catch (error) {
      telemetry.reportError(error);
      return { error: errorMessage(error) };
    }
    revalidatePath(`/projects/${projectId}`);
    return { success: operation === "edit" ? "Comment updated." : "Comment removed." };
  });
}
