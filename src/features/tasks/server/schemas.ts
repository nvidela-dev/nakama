import type { Milestone, TaskAttachment } from "../model";
import { flowIdSchema } from "@/shared/contracts/domain-schemas";
import { z } from "zod";
import type { DatabaseRows } from "@/shared/contracts/database.generated";
import { taskStatusSchema } from "@/shared/contracts/domain-schemas";
import { id } from "@/server/database/row-schemas";
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
export const taskListRevisionSchema = z.object({
  revision: z.number().int().nonnegative(),
}) satisfies z.ZodType<Pick<DatabaseRows["project_task_lists"], "revision">>;

export const milestoneRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  template_id: z.string(),
  flow_id: flowIdSchema,
  status: z.enum(["active", "completed", "archived"]),
  position: z.number().int(),
}) satisfies z.ZodType<Milestone>;
export const attachmentRowSchema = z.object({
  task_id: z.uuid(),
  artifact_id: z.uuid(),
}) satisfies z.ZodType<TaskAttachment>;
