import type { ShirtDesign } from "./shirts/design";
import type { DatabaseRows, ArtifactKind } from "@/shared/contracts/database.generated";
export type { ArtifactKind } from "@/shared/contracts/database.generated";
export type ArtifactTask = Pick<DatabaseRows["artifact_tasks"], "id" | "title" | "status">;
export type ArtifactFile = Pick<
  DatabaseRows["artifact_files"],
  "id" | "name" | "media_type" | "size"
>;
export type Artifact = Omit<
  DatabaseRows["project_artifacts"],
  "created_by" | "updated_by" | "created_at"
> & { project_name: string; tasks: ArtifactTask[] };
export type ArtifactChoice = Pick<Artifact, "id" | "name" | "status">;
export type ArtifactCard = Omit<Artifact, "tasks"> & {
  collection: string | null;
  shirt_poster: string | null;
  shirt_cover: Pick<ShirtDesign["layout"], "color" | "layers" | "ink"> | null;
  task_count: number;
  done_task_count: number;
  cover_id: string | null;
  file_count: number;
  stage_name?: string | null;
};
export type ArtifactDetail = Artifact & {
  files: ArtifactFile[];
  markdown: string | null;
  shirt: ShirtDesign | null;
};
export const artifactKinds: Record<ArtifactKind, string> = {
  image: "Images / designs",
  markdown: "Markdown document",
  software: "Software",
};
export const artifactUrl = (projectId: string, id: string) =>
  `/projects/${projectId}/artifacts/${id}`;
export const artifactFileUrl = (projectId: string, artifactId: string, fileId: string) =>
  `${artifactUrl(projectId, artifactId)}/files/${fileId}`;

export const emptyArtifactFilters = { search: "", project: "all", kind: "all", status: "all" };
export type ArtifactFilters = typeof emptyArtifactFilters;
export type ArtifactPage = { items: ArtifactCard[]; next: string | null };

export type ArtifactDraft = Pick<Artifact, "name" | "description" | "status"> & {
  stageId: string;
  githubUrl: string;
};

export const artifactUploadByteLimit = 2 * 1024 * 1024;
export const artifactStatusLabels = {
  in_progress: "In progress",
  ready: "Ready to use",
} satisfies Record<Artifact["status"], string>;
