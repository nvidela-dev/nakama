import { applyBoardOperation } from "./boards";
import { flowIdSchema } from "@/shared/contracts/domain-schemas";
import { taskListRevisionSchema, projectTaskSchema } from "@/server/database/row-schemas";
import { queryRows } from "@/server/database/query";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database, Queryable } from "@/server/database/database";
import { membership, ProjectError, type Actor } from "@/features/projects/server/projects";
import { recordActivity } from "@/server/database/activity-log";
import type { TaskSnapshot } from "@/features/tasks/model";
import { operation } from "@/features/tasks/input";
export type { TaskOperation } from "@/features/tasks/input";
export class TaskConflictError extends ProjectError {
  override readonly diagnosticType = "TaskConflictError";
  override readonly diagnosticCategory = "conflict";
  constructor(public snapshot: TaskSnapshot) {
    super(
      "The task list changed. Your draft is still here. Review the latest list before trying again.",
    );
  }
}
async function snapshot(tx: Queryable, projectId: string): Promise<TaskSnapshot> {
  const revision =
    (
      await queryRows(
        tx,
        taskListRevisionSchema,
        "SELECT revision FROM project_task_lists WHERE project_id=$1",
        [projectId],
      )
    )[0]?.revision ?? 0;
  const tasks = await queryRows(
    tx,
    projectTaskSchema,
    "SELECT id,parent_id,title,status,collapsed,created_at,updated_at,milestone_id,column_id,board_position FROM project_tasks WHERE project_id=$1 ORDER BY position",
    [projectId],
  );
  const milestones = await queryRows(
    tx,
    z.object({
      id: z.uuid(),
      title: z.string(),
      description: z.string(),
      template_id: z.string(),
      flow_id: flowIdSchema,
      status: z.enum(["active", "completed", "archived"]),
      position: z.number().int(),
    }),
    "SELECT id,title,description,template_id,flow_id,status,position FROM project_milestones WHERE project_id=$1 ORDER BY position,id",
    [projectId],
  );
  const attachments = await queryRows(
    tx,
    z.object({ task_id: z.uuid(), artifact_id: z.uuid() }),
    "SELECT task_id,artifact_id FROM task_artifacts WHERE project_id=$1 ORDER BY created_at,artifact_id",
    [projectId],
  );
  return { revision, tasks, milestones, attachments };
}
// A list-wide revision protects subtree operations when another member adds a child.
async function lock(tx: Queryable, actor: Actor, projectId: string, revision: number) {
  await membership(tx, actor, projectId);
  await tx.query("SELECT id FROM projects WHERE id=$1 FOR UPDATE", [projectId]);
  if (!Number.isSafeInteger(revision) || revision < 0)
    throw new ProjectError("Invalid task revision.");
  const current = await snapshot(tx, projectId);
  if (current.revision !== revision) throw new TaskConflictError(current);
  return current;
}
async function changed(tx: Queryable, projectId: string) {
  await tx.query(
    "INSERT INTO project_task_lists(project_id,revision) VALUES($1,1) ON CONFLICT(project_id) DO UPDATE SET revision=project_task_lists.revision+1",
    [projectId],
  );
  return snapshot(tx, projectId);
}
export function taskService(db: Database) {
  return {
    list: (actor: Actor, projectId: string) =>
      db.transaction(async (tx) => {
        await membership(tx, actor, projectId);
        await tx.query("SELECT id FROM projects WHERE id=$1 FOR SHARE", [projectId]);
        return snapshot(tx, projectId);
      }),
    change: (actor: Actor, projectId: string, revision: number, input: unknown) =>
      db.transaction(async (tx) => {
        const current = await lock(tx, actor, projectId, revision);
        const parsed = operation.safeParse(input);
        if (!parsed.success)
          throw new ProjectError(
            "Check the task title and action. Titles can have up to 300 characters.",
          );
        const op = parsed.data;
        if (await applyBoardOperation(tx, actor, projectId, current, op))
          return changed(tx, projectId);
        if (op.kind === "add") {
          if (current.tasks.length >= 2000)
            throw new ProjectError("This project has reached the 2,000-task limit.");
          if (op.parentId && !current.tasks.some((t) => t.id === op.parentId))
            throw new ProjectError("Task not found.");
          if (op.parentId) {
            let depth = 1,
              parent = current.tasks.find((t) => t.id === op.parentId);
            while (parent?.parent_id) {
              depth++;
              const parentId = parent.parent_id;
              parent = current.tasks.find((t) => t.id === parentId);
            }
            if (depth > 32) throw new ProjectError("Task nesting is limited to 32 levels.");
          }
          await tx.query(
            "INSERT INTO project_tasks(id,project_id,parent_id,title,created_by,updated_by,milestone_id,column_id,board_position,status) VALUES($1,$2,$3,$4,$5,$5,$6,$7,$8,$9)",
            [
              randomUUID(),
              projectId,
              op.parentId,
              op.title,
              actor.userId,
              op.milestoneId ?? null,
              op.milestoneId ? (op.columnId ?? null) : null,
              Math.max(0, ...current.tasks.map((t) => t.board_position)) + 1,
              op.milestoneId ? "ready" : (op.columnId ?? "ready"),
            ],
          );
          if (op.parentId)
            await tx.query(
              "UPDATE project_tasks SET collapsed=false,updated_at=now(),updated_by=$3 WHERE project_id=$1 AND id=$2",
              [projectId, op.parentId, actor.userId],
            );
          await recordActivity(tx, actor, projectId, "task_created");
        } else if (op.kind === "collapse") {
          if (op.ids.some((id) => !current.tasks.some((t) => t.id === id)))
            throw new ProjectError("Task not found.");
          await tx.query(
            "UPDATE project_tasks SET collapsed=$3,updated_at=now(),updated_by=$4 WHERE project_id=$1 AND id=ANY($2::uuid[])",
            [projectId, op.ids, op.collapsed, actor.userId],
          );
        } else if (op.kind === "edit" || op.kind === "delete" || op.kind === "status") {
          const task = current.tasks.find((t) => t.id === op.id);
          if (!task) throw new ProjectError("Task not found.");
          const subtree = [task.id];
          for (let i = 0; i < subtree.length; i++)
            subtree.push(
              ...current.tasks.filter((t) => t.parent_id === subtree[i]).map((t) => t.id),
            );
          if (op.kind === "edit") {
            await tx.query(
              "UPDATE project_tasks SET title=$3,updated_at=now(),updated_by=$4 WHERE project_id=$1 AND id=$2",
              [projectId, op.id, op.title, actor.userId],
            );
            await recordActivity(tx, actor, projectId, "task_edited");
          } else if (op.kind === "delete") {
            await tx.query("DELETE FROM project_tasks WHERE project_id=$1 AND id=$2", [
              projectId,
              op.id,
            ]);
            await recordActivity(tx, actor, projectId, "task_deleted");
          } else {
            const targets = op.scope === "subtree" ? subtree : [op.id];
            if (
              current.tasks.some(
                (task) =>
                  targets.includes(task.id) &&
                  current.milestones.some(
                    (m) => m.id === task.milestone_id && m.status !== "active",
                  ),
              )
            )
              throw new ProjectError("Reopen the milestone before changing card status.");
            if (op.scope === "subtree" && op.status !== "done")
              throw new ProjectError("Only Done can be applied to subtasks together.");
            if (op.status === "done" && subtree.length > 1 && !op.confirmed)
              throw new ProjectError(
                "Confirm whether to complete this task alone or its subtasks too.",
              );
            await tx.query(
              "UPDATE project_tasks SET status=$3,updated_at=now(),updated_by=$4 WHERE project_id=$1 AND id=ANY($2::uuid[])",
              [projectId, op.scope === "subtree" ? subtree : [op.id], op.status, actor.userId],
            );
            await recordActivity(tx, actor, projectId, "task_status_changed");
          }
        }
        return changed(tx, projectId);
      }),
  };
}
