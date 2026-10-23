import { z } from "zod";
import {
  ActivityKindValues,
  ArtifactKindValues,
  ArtifactMediaTypeValues,
  ArtifactStatusValues,
  FlowIdValues,
  MembershipRoleValues,
  NodeStatusValues,
  ProjectStateValues,
  RevisionOriginValues,
  TaskStatusValues,
} from "@/shared/contracts/database.generated";
// SQL enums are the vocabulary source; these validators guard untrusted inputs and decoded rows.
export const membershipRoleSchema = z.enum(MembershipRoleValues);
export const nodeStatusSchema = z.enum(NodeStatusValues);
export const taskStatusSchema = z.enum(TaskStatusValues);
export const artifactKindSchema = z.enum(ArtifactKindValues);
export const artifactStatusSchema = z.enum(ArtifactStatusValues);
export const projectStateSchema = z.enum(ProjectStateValues);
export const activityKindSchema = z.enum(ActivityKindValues);
export const flowIdSchema = z.enum(FlowIdValues);
export const artifactMediaTypeSchema = z.enum(ArtifactMediaTypeValues);
export const revisionOriginSchema = z.enum(RevisionOriginValues);
export const artifactTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(300),
  status: taskStatusSchema,
});
