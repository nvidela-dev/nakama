"use server";
import { runAction } from "@/features/access/server/action-runner";
import { telemetry } from "@/server/observability/observability";

import { revalidatePath } from "next/cache";
import { database } from "@/server/database/db";
import { ConflictError, guidanceService } from "@/features/guidance/server/guidance";
import { ProjectError } from "@/shared/contracts/errors";
import type { NodeStatus } from "@/features/guidance/model/flows";
import { field } from "@/server/actions/form";
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
  return runAction("flow.choose", async (person) => {
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
  return runAction("answer.save", async (person) => {
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
  return runAction("stage.review", async (person) => {
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
