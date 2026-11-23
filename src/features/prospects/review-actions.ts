"use server";

import { revalidatePath } from "next/cache";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError } from "@/shared/contracts/errors";
import { telemetry } from "@/server/observability/observability";
import { observeAction } from "@/server/observability/request-observability";
import type { ActionState } from "@/shared/contracts/action-state";
import { prospectReview } from "./server/review";
import type { ReviewCommand } from "./review-schema";

export async function saveProspectReview(
  command: ReviewCommand,
): Promise<ActionState & { revision?: number; draftId?: string | null }> {
  return observeAction("prospect.change", async () => {
    const person = await actor(true);
    try {
      const saved = await prospectReview(database()).change(person, command);
      revalidatePath("/prospects");
      return { ...saved, success: "Saved." };
    } catch (error) {
      if (!(error instanceof ProjectError)) telemetry.reportError(error);
      return {
        error: error instanceof ProjectError ? error.message : "Unable to save. Please try again.",
      };
    }
  });
}
