import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database, Queryable } from "./database";
import { membership, ProjectError, type Actor } from "./projects";
import { flows, type FlowId } from "./flows";
import { recordActivity } from "./activity-log";
export type CommentTarget = { stageId?: string; nodeId?: string };
export type Comment = { id: string; author_id: string; author_name: string; former_member: boolean; content: string; revision: number; created_at: Date; edited_at: Date | null; deleted_at: Date | null };
export type Activity = { sort_key: string; kind: string; actor_id: string; actor_name: string; former_member: boolean; stage_id: string | null; node_id: string | null; comment_id: string | null; subject_name: string | null; detail: string | null; created_at: Date };
export type Page<T> = { items: T[]; next?: string };
const body = z.string().trim().min(1).max(4000);
const uuid = z.uuid();
function cursor(input?: string) {
  if (!input) return [null, null];
  if (input.length > 512) throw new ProjectError("This page link is invalid. Return to the project.");
  try {
    const value = z.tuple([z.iso.datetime({ offset: true }), z.string().min(1).max(200)]).parse(JSON.parse(Buffer.from(input, "base64url").toString()));
    return value;
  } catch { throw new ProjectError("This page link is invalid. Return to the project."); }
}
function page<T extends { created_at: Date; cursor_time?: string }>(items: T[], key: (item: T) => string): Page<T> {
  const more = items.length > 25;
  const visible = items.slice(0, 25);
  const last = visible.at(-1);
  return { items: visible, next: more && last ? Buffer.from(JSON.stringify([last.cursor_time ?? new Date(last.created_at).toISOString(), key(last)])).toString("base64url") : undefined };
}
async function targetFlow(tx: Queryable, projectId: string, target: CommentTarget) {
  if ((target.stageId !== undefined && !z.string().min(1).max(100).safeParse(target.stageId).success) || (target.nodeId !== undefined && !z.string().min(1).max(100).safeParse(target.nodeId).success)) throw new ProjectError("Comment target not found.");
  if (target.nodeId && !target.stageId) throw new ProjectError("Comment target not found.");
  if (!target.stageId) return null;
  const row = (await tx.query<{ flow_id: FlowId; template_version: number }>("SELECT flow_id, template_version FROM project_flows WHERE project_id=$1", [projectId])).rows[0];
  const flow = row && flows[row.flow_id];
  const stage = flow?.stages.find((stage) => stage.id === target.stageId);
  if (!flow || flow.version !== row.template_version || !stage || (target.nodeId && !stage.nodes.some((node) => node.id === target.nodeId))) throw new ProjectError("Comment target not found.");
  return flow.id;
}
export function collaborationService(db: Database) {
  return {
    async comments(actor: Actor, projectId: string, target: CommentTarget, before?: string) {
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        await targetFlow(tx, projectId, target);
        const [time, id] = cursor(before);
        const rows = (await tx.query<Comment>(`SELECT c.id,c.author_id,c.author_name,c.content,c.revision,c.created_at,c.edited_at,c.deleted_at,
          m.user_id IS NULL AS former_member,
          to_char(c.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'Z' AS cursor_time FROM project_comments c
          LEFT JOIN project_memberships m ON m.project_id=c.project_id AND m.user_id=c.author_id
          WHERE c.project_id=$1 AND c.stage_id IS NOT DISTINCT FROM $2 AND c.node_id IS NOT DISTINCT FROM $3
          AND ($4::timestamptz IS NULL OR (c.created_at,c.id::text)<($4::timestamptz,$5::text))
          ORDER BY c.created_at DESC,c.id DESC LIMIT 26`, [projectId, target.stageId ?? null, target.nodeId ?? null, time, id])).rows;
        return page(rows, (comment) => comment.id);
      });
    },
    async post(actor: Actor, projectId: string, target: CommentTarget, input: string) {
      const content = body.safeParse(input);
      if (!content.success) throw new ProjectError("Write a comment of up to 4,000 characters.");
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        await tx.query("SELECT id FROM projects WHERE id=$1 FOR UPDATE", [projectId]);
        const flowId = await targetFlow(tx, projectId, target);
        const id = randomUUID();
        await tx.query(`INSERT INTO project_comments (id,project_id,flow_id,stage_id,node_id,author_id,author_name,content)
          VALUES ($1,$2,$3,$4,$5,$6,(SELECT display_name FROM project_memberships WHERE project_id=$2 AND user_id=$6),$7)`,
          [id, projectId, flowId, target.stageId ?? null, target.nodeId ?? null, actor.userId, content.data]);
        await recordActivity(tx, actor, projectId, "comment_created", { ...target, commentId: id });
        return id;
      });
    },
    async change(actor: Actor, projectId: string, commentId: string, revision: number, operation: "edit" | "delete", input = "") {
      if (!uuid.safeParse(commentId).success || !Number.isSafeInteger(revision) || revision < 1) throw new ProjectError("Comment not found.");
      if (operation !== "edit" && operation !== "delete") throw new ProjectError("Unknown action.");
      const content = operation === "edit" ? body.safeParse(input) : null;
      if (content && !content.success) throw new ProjectError("Write a comment of up to 4,000 characters.");
      await db.transaction(async (tx) => {
        const member = await membership(tx, actor, projectId);
        await tx.query("SELECT id FROM projects WHERE id=$1 FOR UPDATE", [projectId]);
        const comment = (await tx.query<{ author_id: string; stage_id: string | null; node_id: string | null; revision: number; deleted_at: Date | null }>("SELECT author_id,stage_id,node_id,revision,deleted_at FROM project_comments WHERE project_id=$1 AND id=$2 FOR UPDATE", [projectId, commentId])).rows[0];
        if (!comment || comment.deleted_at || (comment.author_id !== actor.userId && (operation === "edit" || member.role !== "owner"))) throw new ProjectError("Comment not found or this action is not allowed.");
        if (comment.revision !== revision) throw new ProjectError("This comment changed. Reload before saving; your draft is still here.");
        if (operation === "edit") await tx.query("UPDATE project_comments SET content=$1, revision=revision+1, edited_at=now() WHERE id=$2 AND project_id=$3", [content?.success ? content.data : "", commentId, projectId]);
        else await tx.query("UPDATE project_comments SET content='', revision=revision+1, deleted_at=now(), deleted_by=$1 WHERE id=$2 AND project_id=$3", [actor.userId, commentId, projectId]);
        await recordActivity(tx, actor, projectId, operation === "edit" ? "comment_edited" : comment.author_id === actor.userId ? "comment_deleted" : "comment_moderated", { stageId: comment.stage_id ?? undefined, nodeId: comment.node_id ?? undefined, commentId });
      });
    },
    async activity(actor: Actor, projectId: string, before?: string) {
      return db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        const [time, key] = cursor(before);
        const rows = (await tx.query<Activity>(`WITH events AS (
          SELECT 'event:'||id::text AS sort_key,kind,actor_id,actor_name,stage_id,node_id,comment_id,subject_name,NULL::text AS detail,created_at FROM project_activity WHERE project_id=$1
          UNION ALL
          SELECT 'answer:'||node_id||':'||revision::text,CASE WHEN origin='capture' THEN 'answer_captured' ELSE 'answer_saved' END,author_id,NULL, (SELECT stage_id FROM node_answers a WHERE a.project_id=r.project_id AND a.node_id=r.node_id),node_id,NULL::uuid,NULL,CASE WHEN status='answered' THEN COALESCE(choice,status) ELSE status END,created_at FROM answer_revisions r WHERE project_id=$1
          UNION ALL
          SELECT 'review:'||id::text,'stage_reviewed',author_id,NULL,stage_id,NULL,NULL::uuid,NULL,NULL,created_at FROM stage_review_history WHERE project_id=$1
        ) SELECT e.*,COALESCE(e.actor_name,m.display_name,'') AS actor_name,m.user_id IS NULL AS former_member,
          to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'Z' AS cursor_time
          FROM events e LEFT JOIN project_memberships m ON m.project_id=$1 AND m.user_id=e.actor_id
          WHERE ($2::timestamptz IS NULL OR (e.created_at,e.sort_key)<($2::timestamptz,$3::text))
          ORDER BY e.created_at DESC,e.sort_key DESC LIMIT 26`, [projectId, time, key])).rows;
        return page(rows, (event) => event.sort_key);
      });
    },
  };
}
