"use server";
import { revalidatePath } from "next/cache";
import { adminActor } from "@/lib/auth";
import { accessPolicy } from "@/lib/whitelist";
import { ProjectError } from "@/lib/projects";
import type { ActionState } from "@/app/actions";

export async function manageWhitelist(_state: ActionState, data: FormData): Promise<ActionState> {
  const person = await adminActor();
  try {
    const operation = String(data.get("operation") ?? "");
    if (operation === "add") await accessPolicy().add(person, String(data.get("email") ?? ""));
    else if (operation === "remove") await accessPolicy().remove(person, String(data.get("id") ?? ""));
    else throw new ProjectError("Unknown action.");
  } catch (error) {
    return { error: error instanceof ProjectError ? error.message : "Could not update the whitelist. Please try again." };
  }
  revalidatePath("/admin");
  revalidatePath("/projects");
  return { success: "Whitelist updated." };
}
