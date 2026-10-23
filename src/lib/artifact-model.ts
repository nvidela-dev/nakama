export type ArtifactKind = "image" | "markdown" | "software";
export type ArtifactTask = { id: string; title: string; status: "ready" | "in_progress" | "done" };
export type ArtifactFile = { id: string; name: string; media_type: string; size: number };
export type Artifact = {
  id: string; project_id: string; project_name: string; flow_id: string | null; stage_id: string | null;
  name: string; description: string; kind: ArtifactKind; status: "in_progress" | "ready";
  github_url: string | null; tasks: ArtifactTask[]; revision: number; updated_at: Date;
};
export type ArtifactCard = Artifact & { cover_id: string | null; file_count: number; stage_name?: string | null };
export type ArtifactDetail = Artifact & { files: ArtifactFile[]; markdown: string | null };
export const artifactKinds: Record<ArtifactKind, string> = { image: "Images / designs", markdown: "Markdown document", software: "Software" };
export const artifactUrl = (projectId: string, id: string) => `/projects/${projectId}/artifacts/${id}`;
export const artifactFileUrl = (projectId: string, artifactId: string, fileId: string) => `${artifactUrl(projectId,artifactId)}/files/${fileId}`;
