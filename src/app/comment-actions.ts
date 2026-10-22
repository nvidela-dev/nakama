"use server";
import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { collaborationService, type CommentTarget } from "@/lib/collaboration";
import { ProjectError } from "@/lib/projects";
import type { ActionState } from "./actions";
const errorMessage = (error: unknown) => error instanceof ProjectError ? error.message : "Could not save the comment. Your draft is still here.";
export async function postComment(projectId: string, target: CommentTarget, _state: ActionState, data: FormData): Promise<ActionState> {
  const person = await actor();
  try { await collaborationService(database()).post(person, projectId, target, String(data.get("content") ?? "")); }
  catch (error) { return { error: errorMessage(error) }; }
  revalidatePath(`/projects/${projectId}`);
  return { success: "Comment posted." };
}
export async function changeComment(projectId: string, id: string, revision: number, _state: ActionState, data: FormData): Promise<ActionState> {
  const person = await actor();
  const operation = String(data.get("operation") ?? "");
  try {
    if (operation !== "edit" && operation !== "delete") throw new ProjectError("Unknown action.");
    await collaborationService(database()).change(person, projectId, id, revision, operation, String(data.get("content") ?? ""));
  } catch (error) { return { error: errorMessage(error) }; }
  revalidatePath(`/projects/${projectId}`);
  return { success: operation === "edit" ? "Comment updated." : "Comment removed." };
}
