"use server";
import { database } from "@/server/database/db";
import { runAction } from "@/features/access/server/action-runner";
import { referenceService } from "./server/references";
export async function searchChatReferences(projectId: string, search: string) {
  return runAction("comment.references", async (person) =>
    referenceService(database()).search(person, projectId, search),
  );
}
