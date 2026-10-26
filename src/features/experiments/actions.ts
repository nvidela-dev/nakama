"use server";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError } from "@/features/projects/server/projects";
import { experimentService } from "./server/experiments";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";
import type { LabOperation, Plan, Experiment } from "./model";
export type LabResult = { items: Experiment[]; error?: never } | { error: string; items?: never };
export async function saveExperiment(
  projectId: string,
  id: string | null,
  revision: number,
  operation: LabOperation | { kind: "create"; plan: Plan },
): Promise<LabResult> {
  return observeAction("experiment.change", async () => {
    const person = await actor();
    try {
      const service = experimentService(database());
      return {
        items:
          operation.kind === "create"
            ? await service.create(person, projectId, operation.plan)
            : await service.change(person, projectId, id ?? "", revision, operation),
      };
    } catch (error) {
      telemetry.reportError(error);
      return {
        error:
          error instanceof ProjectError
            ? error.message
            : "Could not save. Your draft is still here.",
      };
    }
  });
}
export async function reloadExperiments(projectId: string): Promise<LabResult> {
  return observeAction("experiment.read", async () => {
    const person = await actor();
    try {
      return { items: await experimentService(database()).list(person, projectId) };
    } catch (error) {
      telemetry.reportError(error);
      return { error: "Could not reload experiments. Check your access and try again." };
    }
  });
}
export async function exportExperimentBrief(
  projectId: string,
  id: string,
  runId: string,
): Promise<{ brief?: string; error?: string }> {
  return observeAction("experiment.export", async () => {
    const person = await actor();
    try {
      return { brief: await experimentService(database()).brief(person, projectId, id, runId) };
    } catch (error) {
      telemetry.reportError(error);
      return {
        error: error instanceof ProjectError ? error.message : "Could not prepare the brief.",
      };
    }
  });
}
