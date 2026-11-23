import type { ActionState } from "@/shared/contracts/action-state";
import type { DatabaseRows } from "@/shared/contracts/database.generated";
import type { FeedKind } from "@/shared/contracts/domain-schemas";
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
> & { former_member: boolean; is_read: boolean };
export type { FeedKind } from "@/shared/contracts/domain-schemas";
export type Activity = Pick<
  DatabaseRows["project_activity"],
  "actor_id" | "actor_name" | "stage_id" | "node_id" | "comment_id" | "subject_name" | "created_at"
> & { sort_key: string; kind: FeedKind; former_member: boolean; detail: string | null };
export type Page<T> = { items: T[]; next: string | undefined };

export type InviteActionState = ActionState & { token?: string };
