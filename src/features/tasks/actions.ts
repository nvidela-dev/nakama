"use server";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";

import { revalidatePath } from "next/cache";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError } from "@/features/projects/server/projects";
import { taskService, TaskConflictError, type TaskOperation } from "@/features/tasks/server/tasks";
import type { TaskSnapshot } from "@/features/tasks/model";
type TaskFailure =
  | { error: string; conflict?: false; snapshot?: never }
  | { error: string; conflict: true; snapshot: TaskSnapshot };
export type TaskResult = TaskFailure | { snapshot: TaskSnapshot; error?: never; conflict?: never };
function failure(error: unknown): TaskFailure {
  if (error instanceof TaskConflictError)
    return { error: error.message, snapshot: error.snapshot, conflict: true };
  return {
    error:
      error instanceof ProjectError
        ? error.message
        : "Could not save tasks. Your draft is still here.",
  };
}
export async function changeTask(
  projectId: string,
  revision: number,
  operation: TaskOperation,
): Promise<TaskResult> {
  return observeAction("task.change", async () => {
    const person = await actor();
    let snapshot;
    try {
      snapshot = await taskService(database()).change(person, projectId, revision, operation);
    } catch (error) {
      telemetry.reportError(error);
      return failure(error);
    }
    revalidatePath(`/projects/${projectId}`);
    return { snapshot };
  });
}
