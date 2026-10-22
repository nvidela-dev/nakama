"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { ProjectError, projectService } from "@/lib/projects";
export type ActionState = { error?: string; token?: string; success?: string };
const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const message = (error: unknown) =>
  error instanceof ProjectError
    ? error.message
    : "We could not save this. Please try again; your draft is still here.";
export async function createProject(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const person = await actor();
  let id: string;
  try {
    id = await projectService(database()).create(person, {
      name: field(data, "name"),
      description: field(data, "description"),
    });
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}
export async function invitePerson(
  projectId: string,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const person = await actor();
  try {
    const { token } = await projectService(database()).invite(
      person,
      projectId,
      field(data, "email"),
    );
    revalidatePath(`/projects/${projectId}`);
    return {
      token,
      success: "Invitation ready. Share the link with the person you invited.",
    };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function managePerson(
  projectId: string,
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const person = await actor();
  try {
    const service = projectService(database());
    if (field(data, "operation") === "revoke")
      await service.revoke(person, projectId, field(data, "id"));
    else if (field(data, "operation") === "remove")
      await service.remove(person, projectId, field(data, "id"));
    else throw new ProjectError("Unknown action.");
    revalidatePath(`/projects/${projectId}`);
    return { success: "Access updated." };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function acceptInvitation(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const person = await actor(true);
  let id: string;
  try {
    id = await projectService(database()).accept(person, field(data, "token"));
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}
