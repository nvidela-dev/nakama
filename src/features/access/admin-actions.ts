"use server";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";

import { revalidatePath } from "next/cache";
import { requestPolicy } from "@/features/access/server/request-store";
import { adminActor } from "@/features/access/server/auth";
import { accessPolicy } from "@/features/access/server/whitelist";
import { ProjectError } from "@/features/projects/server/projects";
import type { ActionState } from "@/shared/contracts/action-state";

export async function manageWhitelist(_state: ActionState, data: FormData): Promise<ActionState> {
  return observeAction("admin.whitelist", async () => {
    const person = await adminActor();
    try {
      const operation = String(data.get("operation") ?? "");
      if (operation === "add") await accessPolicy().add(person, String(data.get("email") ?? ""));
      else if (operation === "remove")
        await accessPolicy().remove(person, String(data.get("id") ?? ""));
      else throw new ProjectError("Unknown action.");
    } catch (error) {
      telemetry.reportError(error);
      return {
        error:
          error instanceof ProjectError
            ? error.message
            : "Could not update the whitelist. Please try again.",
      };
    }
    revalidatePath("/admin");
    revalidatePath("/projects");
    return { success: "Whitelist updated." };
  });
}

export async function manageAccessRequest(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  return observeAction("admin.access", async () => {
    const person = await adminActor();
    try {
      const operation = String(data.get("operation") ?? "");
      if (operation !== "allow" && operation !== "dismiss")
        throw new ProjectError("Unknown action.");
      await requestPolicy().manage(person, String(data.get("id") ?? ""), operation);
    } catch (error) {
      telemetry.reportError(error);
      return {
        error:
          error instanceof ProjectError
            ? error.message
            : "Could not update access requests. Please try again.",
      };
    }
    revalidatePath("/admin");
    revalidatePath("/projects");
    return { success: "Access requests updated." };
  });
}
