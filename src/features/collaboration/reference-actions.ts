"use server";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { observeAction } from "@/server/observability/request-observability";
import { referenceService } from "./server/references";
export async function searchChatReferences(projectId: string, search: string) {
  return observeAction("comment.references", async () =>
    referenceService(database()).search(await actor(), projectId, search),
  );
}
