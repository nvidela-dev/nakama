import { z } from "zod";
import type { DatabaseRows, ActivityKind } from "@/shared/contracts/database.generated";
import {
  activityKindSchema,
  artifactKindSchema,
  artifactMediaTypeSchema,
  artifactStatusSchema,
  flowIdSchema,
  membershipRoleSchema,
  nodeStatusSchema,
  projectStateSchema,
  revisionOriginSchema,
  taskStatusSchema,
} from "@/shared/contracts/domain-schemas";
const id = z.uuid(),
  positive = z.number().int().positive();
export const projectSchema = z.object({
  id,
  name: z.string(),
  description: z.string(),
  created_at: z.date(),
  role: membershipRoleSchema,
}) satisfies z.ZodType<
  DatabaseRows["projects"] & Pick<DatabaseRows["project_memberships"], "role">
>;
export const answerSchema = z.object({
  node_id: z.string(),
  stage_id: z.string(),
  revision: positive,
  content: z.string(),
  status: nodeStatusSchema,
  choice: z.string().nullable(),
  needs_review: z.boolean(),
  updated_by: z.string(),
  updated_at: z.date(),
}) satisfies z.ZodType<Omit<DatabaseRows["node_answers"], "project_id">>;
export const revisionSchema = z.object({
  revision: positive,
  content: z.string(),
  status: nodeStatusSchema,
  choice: z.string().nullable(),
  author_id: z.string(),
  origin: revisionOriginSchema,
  created_at: z.date(),
}) satisfies z.ZodType<Omit<DatabaseRows["answer_revisions"], "project_id" | "node_id">>;
export const stageReviewSchema = z.object({
  stage_id: z.string(),
  reviewed: z.boolean(),
  rationale: z.string(),
  reviewed_by: z.string(),
  reviewed_at: z.date(),
}) satisfies z.ZodType<Omit<DatabaseRows["stage_reviews"], "project_id">>;
export const projectTaskSchema = z.object({
  id,
  parent_id: id.nullable(),
  title: z.string(),
  status: taskStatusSchema,
  collapsed: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
  milestone_id: id.nullable(),
  column_id: z.string().nullable(),
  board_position: z.number().int(),
}) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_tasks"],
    | "id"
    | "parent_id"
    | "title"
    | "status"
    | "collapsed"
    | "created_at"
    | "updated_at"
    | "milestone_id"
    | "column_id"
    | "board_position"
  >
>;
export const artifactRowSchema = z.object({
  id,
  project_id: id,
  project_name: z.string(),
  flow_id: flowIdSchema.nullable(),
  stage_id: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  kind: artifactKindSchema,
  status: artifactStatusSchema,
  github_url: z.string().nullable(),
  revision: positive,
  updated_at: z.date(),
}) satisfies z.ZodType<
  Omit<DatabaseRows["project_artifacts"], "created_by" | "updated_by" | "created_at"> & {
    project_name: string;
  }
>;
export const artifactFileSchema = z.object({
  id,
  name: z.string(),
  media_type: artifactMediaTypeSchema,
  size: positive,
}) satisfies z.ZodType<Pick<DatabaseRows["artifact_files"], "id" | "name" | "media_type" | "size">>;
export const membershipSchema = z.object({ role: membershipRoleSchema });
export const memberSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  role: membershipRoleSchema,
  joined_at: z.date(),
}) satisfies z.ZodType<
  Pick<DatabaseRows["project_memberships"], "user_id" | "display_name" | "role" | "joined_at">
>;
export const invitationSchema = z.object({
  id,
  email: z.string(),
  expires_at: z.date(),
  accepted_at: z.date().nullable(),
  revoked_at: z.date().nullable(),
}) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_invitations"],
    "id" | "email" | "expires_at" | "accepted_at" | "revoked_at"
  >
>;
export const countSchema = z.object({ count: z.number().int().nonnegative() });

export const commentRowSchema = z.object({
  id,
  author_id: z.string(),
  author_name: z.string(),
  content: z.string(),
  revision: positive,
  created_at: z.date(),
  edited_at: z.date().nullable(),
  deleted_at: z.date().nullable(),
  former_member: z.boolean(),
  cursor_time: z.string(),
}) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_comments"],
    | "id"
    | "author_id"
    | "author_name"
    | "content"
    | "revision"
    | "created_at"
    | "edited_at"
    | "deleted_at"
  > & { former_member: boolean; cursor_time: string }
>;
export const activityRowSchema = z.object({
  sort_key: z.string(),
  kind: z.union([
    activityKindSchema,
    z.enum(["answer_captured", "answer_saved", "stage_reviewed"]),
  ]),
  actor_id: z.string(),
  actor_name: z.string(),
  stage_id: z.string().nullable(),
  node_id: z.string().nullable(),
  comment_id: id.nullable(),
  subject_name: z.string().nullable(),
  detail: z.string().nullable(),
  created_at: z.date(),
  former_member: z.boolean(),
  cursor_time: z.string(),
}) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_activity"],
    | "actor_id"
    | "actor_name"
    | "stage_id"
    | "node_id"
    | "comment_id"
    | "subject_name"
    | "created_at"
  > & {
    sort_key: string;
    kind: ActivityKind | "answer_captured" | "answer_saved" | "stage_reviewed";
    former_member: boolean;
    detail: string | null;
    cursor_time: string;
  }
>;

export const selectedFlowSchema = z.object({
  flow_id: flowIdSchema,
  template_version: z.number().int().positive(),
  project_state: projectStateSchema,
  content_revision: z.number().int().nonnegative(),
}) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_flows"],
    "flow_id" | "template_version" | "project_state" | "content_revision"
  >
>;
export const taskListRevisionSchema = z.object({
  revision: z.number().int().nonnegative(),
}) satisfies z.ZodType<Pick<DatabaseRows["project_task_lists"], "revision">>;
export const artifactBytesSchema = z.object({ data: z.instanceof(Uint8Array) }) satisfies z.ZodType<
  Pick<DatabaseRows["artifact_files"], "data">
>;
export const cursorTimeSchema = z.object({ cursor_time: z.iso.datetime({ offset: true }) });
export const commentMutationSchema = commentRowSchema
  .pick({ author_id: true, revision: true, deleted_at: true })
  .extend({
    stage_id: z.string().nullable(),
    node_id: z.string().nullable(),
  }) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_comments"],
    "author_id" | "revision" | "deleted_at" | "stage_id" | "node_id"
  >
>;
export const invitationAcceptanceSchema = invitationSchema
  .pick({ email: true, revoked_at: true })
  .extend({
    project_id: id,
    invited_by: z.string(),
    accepted_by: z.string().nullable(),
    expired: z.boolean(),
  }) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_invitations"],
    "email" | "revoked_at" | "project_id" | "invited_by" | "accepted_by"
  > & { expired: boolean }
>;
export const unreadCommentSchema = commentRowSchema
  .pick({ id: true, author_name: true, content: true, created_at: true })
  .extend({
    project_id: id,
    project_name: z.string(),
    stage_id: z.string().nullable(),
    node_id: z.string().nullable(),
    ...cursorTimeSchema.shape,
  }) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_comments"],
    "id" | "author_name" | "content" | "created_at" | "project_id" | "stage_id" | "node_id"
  > & { project_name: string; cursor_time: string }
>;
