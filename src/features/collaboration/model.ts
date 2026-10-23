import type { DatabaseRows, ActivityKind } from "@/shared/contracts/database.generated";
export type CommentTarget =
  { stageId?: never; nodeId?: never } | { stageId: string; nodeId?: string };
export type Comment = Pick<
  DatabaseRows["project_comments"],
  | "id"
  | "author_id"
  | "author_name"
  | "content"
  | "revision"
  | "created_at"
  | "edited_at"
  | "deleted_at"
> & { former_member: boolean };
export type FeedKind = ActivityKind | "answer_captured" | "answer_saved" | "stage_reviewed";
export type Activity = Pick<
  DatabaseRows["project_activity"],
  "actor_id" | "actor_name" | "stage_id" | "node_id" | "comment_id" | "subject_name" | "created_at"
> & { sort_key: string; kind: FeedKind; former_member: boolean; detail: string | null };
export type Page<T> = { items: T[]; next: string | undefined };
