"use server";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";

import { revalidatePath } from "next/cache";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ConflictError, guidanceService } from "@/features/guidance/server/guidance";
import { ProjectError } from "@/features/projects/server/projects";
import type { NodeStatus } from "@/features/guidance/model/flows";
export type GuidanceActionState = {
  error?: string;
  success?: string;
  savedRevision?: number;
  conflict?: {
    content: string;
    status: NodeStatus;
    choice: string | null;
    revision: number;
  };
};
const field = (data: FormData, name: string) => String(data.get(name) ?? "");
function failure(error: unknown): GuidanceActionState {
  if (error instanceof ConflictError)
    return {
      error: error.message,
      conflict: {
        content: error.current.content,
        status: error.current.status,
        choice: error.current.choice,
        revision: error.current.revision,
      },
    };
  return {
    error:
      error instanceof ProjectError
        ? error.message
        : "We could not save this. Your draft is still here; please try again.",
  };
}
export async function chooseFlow(
  projectId: string,
  _state: GuidanceActionState,
  data: FormData,
): Promise<GuidanceActionState> {
  return observeAction("flow.choose", async () => {
    const person = await actor();
    try {
      await guidanceService(database()).select(person, projectId, field(data, "flow"));
    } catch (error) {
      telemetry.reportError(error);
      return failure(error);
    }
    revalidatePath(`/projects/${projectId}`);
    return { success: "Workflow selected." };
  });
}
export async function saveAnswer(
  projectId: string,
  nodeId: string,
  _state: GuidanceActionState,
  data: FormData,
): Promise<GuidanceActionState> {
  return observeAction("answer.save", async () => {
    const person = await actor();
    try {
      const savedRevision = await guidanceService(database()).save(person, projectId, nodeId, {
        content: field(data, "content"),
        status: field(data, "status"),
        choice: field(data, "choice") || null,
        revision: Number(field(data, "revision")),
      });
      revalidatePath(`/projects/${projectId}`);
      revalidatePath("/projects");
      return { savedRevision, success: "Saved." };
    } catch (error) {
      telemetry.reportError(error);
      return failure(error);
    }
  });
}
export async function reviewStage(
  projectId: string,
  stageId: string,
  _state: GuidanceActionState,
  data: FormData,
): Promise<GuidanceActionState> {
  return observeAction("stage.review", async () => {
    const person = await actor();
    try {
      await guidanceService(database()).reviewStage(
        person,
        projectId,
        stageId,
        field(data, "rationale"),
        Number(field(data, "revision")),
      );
    } catch (error) {
      telemetry.reportError(error);
      return failure(error);
    }
    revalidatePath(`/projects/${projectId}`);
    return {
      success: "Stage review saved.",
    };
  });
}
