import { lockProject } from "@/server/database/membership";
import { encodeCursor, decodeCursor } from "@/server/database/cursor";
import { selectedFlowSchema } from "@/features/guidance/server/schemas";
import { cursorTimeSchema } from "@/server/database/row-schemas";
import {
  commentMutationSchema,
  commentRowSchema,
  activityRowSchema,
} from "@/features/collaboration/server/schemas";
import { queryRows } from "@/server/database/query";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database, Queryable } from "@/server/database/database";
import { withProjectRead, type ProjectRead } from "@/server/database/membership";
import { ProjectError } from "@/shared/contracts/errors";
import { type Actor } from "@/shared/contracts/actor";
import { flows } from "@/features/guidance/model/flows";
import { recordActivity } from "@/server/database/activity-log";
import type { CommentTarget, Page } from "@/features/collaboration/model";
export function commentTarget(stageId?: string, nodeId?: string): CommentTarget {
  if (nodeId && !stageId) throw new ProjectError("Comment target not found.");
  return stageId ? { stageId, ...(nodeId ? { nodeId } : {}) } : {};
}
export type {
  CommentTarget,
  Comment,
  FeedKind,
  Activity,
  Page,
} from "@/features/collaboration/model";
const body = z.string().trim().min(1).max(4000);
const uuid = z.uuid();
const pageKey = z.string().min(1).max(200);
function cursor(input?: string): [string | null, string | null] {
  return input
    ? decodeCursor(input, pageKey, "This page link is invalid. Return to the project.")
    : [null, null];
}
function page<T extends { created_at: Date; cursor_time?: string }>(
  items: T[],
  key: (item: T) => string,
): Page<T> {
  const more = items.length > 25;
  const visible = items.slice(0, 25);
  const last = visible.at(-1);
  return {
    items: visible,
    next:
      more && last
        ? encodeCursor(last.cursor_time ?? last.created_at.toISOString(), key(last))
        : undefined,
  };
}
async function targetFlow(tx: Queryable, projectId: string, target: CommentTarget) {
  if (
    (target.stageId !== undefined &&
      !z.string().min(1).max(100).safeParse(target.stageId).success) ||
    (target.nodeId !== undefined && !z.string().min(1).max(100).safeParse(target.nodeId).success)
  )
    throw new ProjectError("Comment target not found.");
  if (target.nodeId && !target.stageId) throw new ProjectError("Comment target not found.");
  if (!target.stageId) return null;
  if (target.stageId === "tasks" || target.stageId === "artifacts") {
    if (target.nodeId) throw new ProjectError("Comment target not found.");
    return null;
  }

  const row = (
    await queryRows(
      tx,
      selectedFlowSchema.pick({ flow_id: true, template_version: true }),
      "SELECT flow_id, template_version FROM project_flows WHERE project_id=$1",
      [projectId],
    )
  )[0];
  const flow = row && flows[row.flow_id];
  const stage = flow?.stages.find((stage) => stage.id === target.stageId);
  if (
    !flow ||
    flow.version !== row.template_version ||
    !stage ||
    (target.nodeId && !stage.nodes.some((node) => node.id === target.nodeId))
  )
    throw new ProjectError("Comment target not found.");
  return flow.id;
}
export async function readComments(
  { tx, projectId, actor }: ProjectRead,
  target: CommentTarget,
  before?: string,
  focusId?: string,
) {
  await targetFlow(tx, projectId, target);
  let [time, id] = cursor(before);
  const targetValues: string[] = [projectId];
  function matches(column: string, value?: string) {
    return value === undefined ? column + " IS NULL" : column + " = $" + targetValues.push(value);
  }
  const predicate = [
    "c.project_id=$1",
    matches("c.stage_id", target.stageId),
    matches("c.node_id", target.nodeId),
  ].join(" AND ");
  if (!before && focusId) {
    if (!uuid.safeParse(focusId).success) throw new ProjectError("Comment not found.");
    const focused = (
      await queryRows(
        tx,
        cursorTimeSchema,
        `SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'Z' AS cursor_time FROM project_comments c WHERE ${predicate} AND id=$${targetValues.length + 1}`,
        [...targetValues, focusId],
      )
    )[0];
    if (!focused) throw new ProjectError("Comment not found.");
    time = focused.cursor_time;
    id = focusId;
  }
  if (id && !uuid.safeParse(id).success)
    throw new ProjectError("This page link is invalid. Return to the project.");
  const values: unknown[] = [...targetValues, actor.userId];
  const reader = values.length;
  let boundary = "";
  if (time && id) {
    const comparison = !before && focusId ? "<=" : "<";
    boundary = `AND (c.created_at,c.id) ${comparison} ($${values.push(time)}::timestamptz,$${values.push(id)}::uuid)`;
  }
  const rows = await queryRows(
    tx,
    commentRowSchema,
    `SELECT c.id,c.author_id,c.author_name,c.content,c.revision,c.created_at,c.edited_at,c.deleted_at,
      m.user_id IS NULL AS former_member,
      EXISTS (SELECT 1 FROM comment_reads r WHERE r.comment_id=c.id AND r.user_id=$${reader}) AS is_read,
      to_char(c.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'Z' AS cursor_time FROM project_comments c
      LEFT JOIN project_memberships m ON m.project_id=c.project_id AND m.user_id=c.author_id
      WHERE ${predicate} ${boundary}
      ORDER BY c.created_at DESC,c.id DESC LIMIT 26`,
    values,
  );
  return page(rows, (comment) => comment.id);
}
export async function readActivity({ tx, projectId }: ProjectRead, before?: string) {
  const [time, key] = cursor(before);
  const rows = await queryRows(
    tx,
    activityRowSchema,
    `WITH events AS (
      (SELECT 'event:'||id::text AS sort_key,kind::text,actor_id,actor_name,stage_id,node_id,comment_id,subject_name,NULL::text AS detail,created_at
       FROM project_activity WHERE project_id=$1 AND ($2::timestamptz IS NULL OR (created_at,'event:'||id::text)<($2,$3::text))
       ORDER BY created_at DESC,sort_key DESC LIMIT 26)
      UNION ALL
      (SELECT 'answer:'||node_id||':'||revision::text AS sort_key,CASE WHEN origin='capture' THEN 'answer_captured' ELSE 'answer_saved' END,author_id,author_name,NULL,node_id,NULL::uuid,NULL,CASE WHEN status='answered' THEN COALESCE(choice,status::text) ELSE status::text END,created_at
       FROM answer_revisions WHERE project_id=$1 AND ($2::timestamptz IS NULL OR (created_at,'answer:'||node_id||':'||revision::text)<($2,$3::text))
       ORDER BY created_at DESC,sort_key DESC LIMIT 26)
      UNION ALL
      (SELECT 'review:'||id::text AS sort_key,'stage_reviewed',author_id,author_name,stage_id,NULL,NULL::uuid,NULL,NULL,created_at
       FROM stage_review_history WHERE project_id=$1 AND ($2::timestamptz IS NULL OR (created_at,'review:'||id::text)<($2,$3::text))
       ORDER BY created_at DESC,sort_key DESC LIMIT 26)
    ), recent AS (SELECT * FROM events ORDER BY created_at DESC,sort_key DESC LIMIT 26)
    SELECT e.sort_key,e.kind,e.actor_id,e.node_id,e.comment_id,e.subject_name,e.detail,e.created_at,
      COALESCE(e.stage_id,a.stage_id) AS stage_id,COALESCE(e.actor_name,'') AS actor_name,m.user_id IS NULL AS former_member,
      to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')||'Z' AS cursor_time
      FROM recent e LEFT JOIN project_memberships m ON m.project_id=$1 AND m.user_id=e.actor_id
      LEFT JOIN node_answers a ON e.kind IN ('answer_captured','answer_saved') AND a.project_id=$1 AND a.node_id=e.node_id
      ORDER BY e.created_at DESC,e.sort_key DESC`,
    [projectId, time, key],
  );
  return page(rows, (event) => event.sort_key);
}
export function collaborationService(db: Database) {
  return {
    async comments(
      actor: Actor,
      projectId: string,
      target: CommentTarget,
      before?: string,
      focusId?: string,
    ) {
      return withProjectRead(db, actor, projectId, (scope) =>
        readComments(scope, target, before, focusId),
      );
    },
    async post(actor: Actor, projectId: string, target: CommentTarget, input: string) {
      const content = body.safeParse(input);
      if (!content.success) throw new ProjectError("Write a comment of up to 4,000 characters.");
      return db.transaction(async (tx) => {
        await lockProject(tx, actor, projectId, "write");
        const flowId = await targetFlow(tx, projectId, target);
        const id = randomUUID();
        await tx.query(
          `INSERT INTO project_comments (id,project_id,flow_id,stage_id,node_id,author_id,author_name,content)
          VALUES ($1,$2,$3,$4,$5,$6,(SELECT display_name FROM project_memberships WHERE project_id=$2 AND user_id=$6),$7)`,
          [
            id,
            projectId,
            flowId,
            target.stageId ?? null,
            target.nodeId ?? null,
            actor.userId,
            content.data,
          ],
        );
        await recordActivity(tx, actor, projectId, "comment_created", { ...target, commentId: id });
        return id;
      });
    },
    async change(
      actor: Actor,
      projectId: string,
      commentId: string,
      revision: number,
      operation: "edit" | "delete",
      input = "",
    ) {
      if (!uuid.safeParse(commentId).success || !Number.isSafeInteger(revision) || revision < 1)
        throw new ProjectError("Comment not found.");
      if (operation !== "edit" && operation !== "delete") throw new ProjectError("Unknown action.");
      const content = operation === "edit" ? body.safeParse(input) : null;
      if (content && !content.success)
        throw new ProjectError("Write a comment of up to 4,000 characters.");
      await db.transaction(async (tx) => {
        const member = await lockProject(tx, actor, projectId, "write");
        const comment = (
          await queryRows(
            tx,
            commentMutationSchema,
            "SELECT author_id,stage_id,node_id,revision,deleted_at FROM project_comments WHERE project_id=$1 AND id=$2 FOR UPDATE",
            [projectId, commentId],
          )
        )[0];
        if (
          !comment ||
          comment.deleted_at ||
          (comment.author_id !== actor.userId && (operation === "edit" || member.role !== "owner"))
        )
          throw new ProjectError("Comment not found or this action is not allowed.");
        if (comment.revision !== revision)
          throw new ProjectError(
            "This comment changed. Reload before saving; your draft is still here.",
          );
        if (operation === "edit")
          await tx.query(
            "UPDATE project_comments SET content=$1, revision=revision+1, edited_at=now() WHERE id=$2 AND project_id=$3",
            [content?.success ? content.data : "", commentId, projectId],
          );
        else
          await tx.query(
            "UPDATE project_comments SET content='', revision=revision+1, deleted_at=now(), deleted_by=$1 WHERE id=$2 AND project_id=$3",
            [actor.userId, commentId, projectId],
          );
        await recordActivity(
          tx,
          actor,
          projectId,
          operation === "edit"
            ? "comment_edited"
            : comment.author_id === actor.userId
              ? "comment_deleted"
              : "comment_moderated",
          {
            ...commentTarget(comment.stage_id ?? undefined, comment.node_id ?? undefined),
            commentId,
          },
        );
      });
    },
    async activity(actor: Actor, projectId: string, before?: string) {
      return withProjectRead(db, actor, projectId, (scope) => readActivity(scope, before));
    },
  };
}
