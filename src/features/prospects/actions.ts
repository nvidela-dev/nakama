"use server";
import { revalidatePath } from "next/cache";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";
import { ProjectError } from "@/shared/contracts/errors";
import type { ActionState } from "@/shared/contracts/action-state";
import type { ProspectCommand } from "./model";
import { prospectService } from "./server/catalogue";

export async function updateProspect(
  command: ProspectCommand,
): Promise<ActionState & { added?: number }> {
  return observeAction("prospect.change", async () => {
    const person = await actor(true);
    try {
      const result = await prospectService(database()).change(person, command);
      revalidatePath("/prospects");
      return { success: "Saved.", ...result };
    } catch (error) {
      if (!(error instanceof ProjectError)) telemetry.reportError(error);
      else revalidatePath("/prospects");
      return {
        error: error instanceof ProjectError ? error.message : "Unable to save. Please try again.",
      };
    }
  });
}

export async function saveProspectImport(
  digest: string,
  step:
    | { type: "start"; size: number }
    | { type: "part"; position: number; bytes: ArrayBuffer }
    | { type: "finish" },
) {
  return observeAction("prospect.change", async () => {
    const person = await actor(true);
    try {
      const { sourceImports } = await import("./server/imports");
      const service = sourceImports(database());
      if (step.type === "start") return { report: await service.start(person, digest, step.size) };
      if (step.type === "part") {
        await service.append(person, digest, step.position, new Uint8Array(step.bytes));
        return {};
      }
      if (step.type !== "finish")
        throw new ProjectError("Check the prospect details and try again.");
      const report = await service.finish(person, digest);
      revalidatePath("/prospects");
      return { report };
    } catch (error) {
      if (!(error instanceof ProjectError)) telemetry.reportError(error);
      return {
        error: error instanceof ProjectError ? error.message : "Unable to save. Please try again.",
      };
    }
  });
}
