import { artifactService } from "@/features/artifacts/server/artifacts";
import { z } from "zod";
import type { Queryable } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
import { ProjectError, type Actor } from "@/features/projects/server/projects";
import { flowIdSchema } from "@/shared/contracts/domain-schemas";
import type { TaskSnapshot } from "../model";
import type { TaskOperation } from "../input";
import {
  allowedTemplates,
  milestoneTemplates,
  type MilestoneTemplateId,
} from "../milestone-catalog";
export async function applyBoardOperation(
  tx: Queryable,
  actor: Actor,
  projectId: string,
  current: TaskSnapshot,
  op: TaskOperation,
): Promise<boolean> {
  if (op.kind === "create-artifact") {
    if (!current.tasks.some((task) => task.id === op.id)) throw new ProjectError("Task not found.");
    const artifactId = await artifactService({
      query: (q, v) => tx.query(q, v),
      transaction: (work) => work(tx),
    }).create(actor, projectId, { name: op.name, kind: op.artifactKind });
    await tx.query(
      "INSERT INTO task_artifacts(project_id,task_id,artifact_id,created_by) VALUES($1,$2,$3,$4)",
      [projectId, op.id, artifactId, actor.userId],
    );
    return true;
  }
  if (op.kind === "milestone-add") {
    const flow = (
      await queryRows(
        tx,
        z.object({ flow_id: flowIdSchema }),
        "SELECT flow_id FROM project_flows WHERE project_id=$1",
        [projectId],
      )
    )[0]?.flow_id;
    if (!flow || !allowedTemplates(flow).some((t) => t.id === op.templateId))
      throw new ProjectError("Choose a board template allowed by this project flow.");
    if (current.milestones.length >= 100)
      throw new ProjectError("This project has reached the 100-milestone limit.");
    await tx.query(
      "INSERT INTO project_milestones(project_id,flow_id,template_id,title,description,position,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$7)",
      [
        projectId,
        flow,
        op.templateId,
        op.title,
        op.description,
        Math.max(-1, ...current.milestones.map((m) => m.position)) + 1,
        actor.userId,
      ],
    );
    return true;
  }
  if (
    op.kind === "milestone-edit" ||
    op.kind === "milestone-delete" ||
    op.kind === "milestone-order"
  ) {
    const milestone = current.milestones.find((m) => m.id === op.id);
    if (!milestone) throw new ProjectError("Milestone not found.");
    if (op.kind === "milestone-edit") {
      if (
        op.status === "completed" &&
        current.tasks.some((t) => t.milestone_id === op.id && t.status !== "done")
      )
        throw new ProjectError(
          "Finish or move the remaining cards before completing this milestone.",
        );
      await tx.query(
        "UPDATE project_milestones SET title=$3,description=$4,status=$5,updated_by=$6,updated_at=now() WHERE project_id=$1 AND id=$2",
        [projectId, op.id, op.title, op.description, op.status, actor.userId],
      );
    } else if (op.kind === "milestone-delete") {
      await tx.query(
        "UPDATE project_tasks SET milestone_id=NULL,column_id=NULL,updated_by=$3,updated_at=now() WHERE project_id=$1 AND milestone_id=$2",
        [projectId, op.id, actor.userId],
      );
      await tx.query("DELETE FROM project_milestones WHERE project_id=$1 AND id=$2", [
        projectId,
        op.id,
      ]);
    } else {
      const ordered = current.milestones.filter((m) => m.id !== op.id).map((m) => m.id);
      const index = op.beforeId === null ? ordered.length : ordered.indexOf(op.beforeId);
      if (index < 0) throw new ProjectError("Milestone not found.");
      ordered.splice(index, 0, op.id);
      for (let i = 0; i < ordered.length; i++)
        await tx.query(
          "UPDATE project_milestones SET position=$3,updated_by=$4,updated_at=now() WHERE project_id=$1 AND id=$2",
          [projectId, ordered[i], i, actor.userId],
        );
    }
    return true;
  }
  if (op.kind === "move" || op.kind === "attach" || op.kind === "add") {
    if (op.kind !== "add" && !current.tasks.some((t) => t.id === op.id))
      throw new ProjectError("Task not found.");
    if (op.kind === "attach") {
      const found = await queryRows(
        tx,
        z.object({ id: z.uuid() }),
        "SELECT id FROM project_artifacts WHERE project_id=$1 AND id=$2",
        [projectId, op.artifactId],
      );
      if (!found.length) throw new ProjectError("Artifact not found.");
      if (op.remove)
        await tx.query(
          "DELETE FROM task_artifacts WHERE project_id=$1 AND task_id=$2 AND artifact_id=$3",
          [projectId, op.id, op.artifactId],
        );
      else
        await tx.query(
          "INSERT INTO task_artifacts(project_id,task_id,artifact_id,created_by) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
          [projectId, op.id, op.artifactId, actor.userId],
        );
      return true;
    }
    const milestone = op.milestoneId
      ? current.milestones.find((m) => m.id === op.milestoneId)
      : undefined;
    if (op.milestoneId && (!milestone || milestone.status !== "active"))
      throw new ProjectError("Choose an active milestone.");
    const column = milestone
      ? milestoneTemplates[milestone.template_id as MilestoneTemplateId]?.columns.find(
          (c) => c.id === op.columnId,
        )
      : undefined;
    if (milestone && !column) throw new ProjectError("Choose a valid board column.");
    if (op.kind === "add") {
      if (!milestone && op.columnId && !["ready", "in_progress", "done"].includes(op.columnId))
        throw new ProjectError("Choose a valid board column.");
      return false;
    }
    const status = column?.status ?? op.columnId;
    if (!["ready", "in_progress", "done"].includes(status))
      throw new ProjectError("Choose a valid board column.");
    if (status === "done" && current.tasks.some((t) => t.parent_id === op.id) && !op.confirmed)
      throw new ProjectError("Confirm whether to complete this task alone or its subtasks too.");
    const cards = current.tasks
      .filter(
        (t) =>
          t.id !== op.id &&
          t.milestone_id === op.milestoneId &&
          (milestone ? t.column_id === op.columnId : t.status === status),
      )
      .sort((a, b) => a.board_position - b.board_position);
    const index =
      op.beforeId === null ? cards.length : cards.findIndex((t) => t.id === op.beforeId);
    if (index < 0) throw new ProjectError("The destination card changed. Reload the board.");
    const ids = cards.map((t) => t.id);
    ids.splice(index, 0, op.id);
    await tx.query(
      "UPDATE project_tasks SET milestone_id=$3,column_id=$4,status=$5,updated_by=$6,updated_at=now() WHERE project_id=$1 AND id=$2",
      [projectId, op.id, op.milestoneId, milestone ? op.columnId : null, status, actor.userId],
    );
    for (let i = 0; i < ids.length; i++)
      await tx.query("UPDATE project_tasks SET board_position=$3 WHERE project_id=$1 AND id=$2", [
        projectId,
        ids[i],
        i,
      ]);
    return true;
  }
  return false;
}
