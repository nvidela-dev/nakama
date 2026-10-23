// Stable diagnostic identity survives production minification. These fields never
// include the error message or the private snapshots attached to conflict errors.
export type DomainErrorType = "ProjectError" | "ConflictError" | "TaskConflictError" | "ArtifactConflictError";
export class ProjectError extends Error {
  readonly diagnosticType: DomainErrorType = "ProjectError";
  readonly diagnosticCategory: "rejected" | "conflict" = "rejected";
}
