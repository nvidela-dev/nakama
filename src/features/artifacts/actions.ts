"use server";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";

import { revalidatePath } from "next/cache";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { artifactService, ArtifactConflictError } from "@/features/artifacts/server/artifacts";
import { ProjectError } from "@/features/projects/server/projects";
import type { ArtifactDetail } from "@/features/artifacts/model";
type ArtifactFailure = {
  error: string;
  current?: ArtifactDetail;
  artifact?: never;
  id?: never;
  deleted?: never;
};
export type ArtifactSaved = {
  artifact: ArtifactDetail;
  error?: never;
  current?: never;
  id?: never;
  deleted?: never;
};
type ArtifactCreated = {
  id: string;
  artifact?: never;
  deleted?: never;
  error?: never;
  current?: never;
};
type ArtifactDeleted = {
  deleted: true;
  artifact?: never;
  id?: never;
  error?: never;
  current?: never;
};
export type ArtifactResult = ArtifactFailure | ArtifactSaved | ArtifactCreated | ArtifactDeleted;
function failure(error: unknown): ArtifactFailure {
  if (error instanceof ArtifactConflictError)
    return { error: error.message, current: error.current };
  return {
    error:
      error instanceof ProjectError
        ? error.message
        : "Could not save the artifact. Your draft is still here.",
  };
}
function refresh(projectId: string) {
  revalidatePath("/artifacts");
  revalidatePath(`/projects/${projectId}`, "layout");
}
export async function createArtifact(
  projectId: string,
  input: unknown,
): Promise<ArtifactCreated | ArtifactFailure> {
  return observeAction("artifact.create", async () => {
    const person = await actor();
    try {
      const id = await artifactService(database()).create(person, projectId, input);
      refresh(projectId);
      return { id };
    } catch (error) {
      telemetry.reportError(error);
      return failure(error);
    }
  });
}
export async function changeArtifact(
  projectId: string,
  id: string,
  revision: number,
  operation: "metadata" | "tasks" | "remove-file" | "delete",
  input: unknown,
): Promise<ArtifactResult> {
  return observeAction("artifact.change", async () => {
    const person = await actor(),
      service = artifactService(database());
    try {
      let artifact: ArtifactDetail;
      if (operation === "metadata")
        artifact = await service.save(person, projectId, id, revision, input);
      else if (operation === "tasks")
        artifact = await service.tasks(person, projectId, id, revision, input);
      else if (operation === "remove-file")
        artifact = await service.removeFile(person, projectId, id, revision, String(input));
      else if (operation === "delete") {
        await service.remove(person, projectId, id, revision, String(input));
        refresh(projectId);
        return { deleted: true };
      } else throw new ProjectError("Unknown action.");
      refresh(projectId);
      return { artifact };
    } catch (error) {
      telemetry.reportError(error);
      return failure(error);
    }
  });
}
export async function uploadArtifactFile(
  projectId: string,
  id: string,
  revision: number,
  data: FormData,
): Promise<ArtifactSaved | ArtifactFailure> {
  return observeAction("artifact.upload", async () => {
    const person = await actor();
    try {
      const file = data.get("file");
      if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024)
        throw new ProjectError("Choose a file up to 2 MB.");
      const artifact = await artifactService(database()).upload(person, projectId, id, revision, {
        name: file.name,
        data: new Uint8Array(await file.arrayBuffer()),
      });
      refresh(projectId);
      return { artifact };
    } catch (error) {
      telemetry.reportError(error);
      return failure(error);
    }
  });
}

export async function readArtifact(
  projectId: string,
  id: string,
): Promise<ArtifactSaved | ArtifactFailure> {
  return observeAction("artifact.read", async () => {
    try {
      return { artifact: await artifactService(database()).get(await actor(), projectId, id) };
    } catch (error) {
      telemetry.reportError(error);
      return failure(error);
    }
  });
}
