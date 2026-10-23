"use server";
import { revalidatePath } from "next/cache";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { artifactService, ArtifactConflictError } from "@/lib/artifacts";
import { ProjectError } from "@/lib/projects";
import type { ArtifactDetail } from "@/lib/artifact-model";
export type ArtifactResult = { artifact?: ArtifactDetail; id?: string; deleted?: boolean; error?: string; current?: ArtifactDetail };
function failure(error: unknown): ArtifactResult {
  if (error instanceof ArtifactConflictError) return {error:error.message,current:error.current};
  return {error:error instanceof ProjectError ? error.message : "Could not save the artifact. Your draft is still here."};
}
function refresh(projectId: string) {
  revalidatePath("/artifacts");
  revalidatePath(`/projects/${projectId}`,"layout");
}
export async function createArtifact(projectId: string, input: unknown): Promise<ArtifactResult> {
  const person=await actor();
  try { const id=await artifactService(database()).create(person,projectId,input); refresh(projectId); return {id}; }
  catch(error) { return failure(error); }
}
export async function changeArtifact(projectId: string, id: string, revision: number, operation: "metadata" | "tasks" | "remove-file" | "delete", input: unknown): Promise<ArtifactResult> {
  const person=await actor(), service=artifactService(database());
  try {
    let artifact: ArtifactDetail;
    if(operation==="metadata") artifact=await service.save(person,projectId,id,revision,input);
    else if(operation==="tasks") artifact=await service.tasks(person,projectId,id,revision,input);
    else if(operation==="remove-file") artifact=await service.removeFile(person,projectId,id,revision,String(input));
    else if(operation==="delete") { await service.remove(person,projectId,id,revision,String(input)); refresh(projectId); return {deleted:true}; }
    else throw new ProjectError("Unknown action.");
    refresh(projectId);return {artifact};
  } catch(error) { return failure(error); }
}
export async function uploadArtifactFile(projectId: string, id: string, revision: number, data: FormData): Promise<ArtifactResult> {
  const person=await actor();
  try {
    const file=data.get("file");
    if (!(file instanceof File) || !file.size || file.size>2*1024*1024) throw new ProjectError("Choose a file up to 2 MB.");
    const artifact=await artifactService(database()).upload(person,projectId,id,revision,{name:file.name,data:new Uint8Array(await file.arrayBuffer())});
    refresh(projectId); return {artifact};
  } catch(error) { return failure(error); }
}
