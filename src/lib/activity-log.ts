import { randomUUID } from "node:crypto";
import type { Queryable } from "./database";
import type { Actor } from "./projects";
export type ActivityKind = "task_created" | "task_edited" | "task_status_changed" | "task_deleted" | "tasks_imported" | "project_created" | "project_edited" | "flow_selected" | "invitation_created" | "invitation_revoked" | "member_joined" | "member_removed" | "comment_created" | "comment_edited" | "comment_deleted" | "comment_moderated";
export async function recordActivity(tx: Queryable, actor: Actor, projectId: string, kind: ActivityKind, target: { stageId?: string; nodeId?: string; commentId?: string; subjectName?: string } = {}) {
  await tx.query(`INSERT INTO project_activity (id, project_id, kind, actor_id, actor_name, stage_id, node_id, comment_id, subject_name)
    VALUES ($1,$2,$3,$4,COALESCE((SELECT display_name FROM project_memberships WHERE project_id=$2 AND user_id=$4),$5),$6,$7,$8,$9)`,
    [randomUUID(), projectId, kind, actor.userId, actor.displayName || "Member", target.stageId ?? null, target.nodeId ?? null, target.commentId ?? null, target.subjectName ?? null]);
}
