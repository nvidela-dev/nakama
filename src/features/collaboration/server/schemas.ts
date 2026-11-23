import { z } from "zod";
import type { DatabaseRows } from "@/shared/contracts/database.generated";
import { feedKindSchema, type FeedKind } from "@/shared/contracts/domain-schemas";
import { id, positive, cursorTimeSchema } from "@/server/database/row-schemas";
export const commentRowSchema = z.object({
  id,
  author_id: z.string(),
  author_name: z.string(),
  content: z.string(),
  revision: positive,
  created_at: z.date(),
  edited_at: z.date().nullable(),
  deleted_at: z.date().nullable(),
  is_read: z.boolean(),
  former_member: z.boolean(),
  ...cursorTimeSchema.shape,
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
  kind: feedKindSchema,
  actor_id: z.string(),
  actor_name: z.string(),
  stage_id: z.string().nullable(),
  node_id: z.string().nullable(),
  comment_id: id.nullable(),
  subject_name: z.string().nullable(),
  detail: z.string().nullable(),
  created_at: z.date(),
  former_member: z.boolean(),
  ...cursorTimeSchema.shape,
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
    kind: FeedKind;
    former_member: boolean;
    detail: string | null;
    cursor_time: string;
  }
>;

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

export const referenceSchema = z.object({
  kind: z.enum(["project", "artifact"]),
  id: id,
  project_id: id,
  name: z.string(),
  project_name: z.string(),
});
