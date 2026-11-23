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
export const projectNameSchema = z.string().trim().min(1).max(100);
export const projectDescriptionSchema = z.string().trim().min(1).max(2000);
export const taskTitleSchema = z.string().trim().min(1).max(300);
export const uuidSchema = z.uuid();
export const artifactTaskSchema = z.object({
  id: uuidSchema,
  title: taskTitleSchema,
  status: taskStatusSchema,
});

export const feedKindSchema = z.union([
  activityKindSchema,
  z.enum(["answer_captured", "answer_saved", "stage_reviewed"]),
]);
export type FeedKind = z.infer<typeof feedKindSchema>;
