import { z } from "zod";
import { taskStatusSchema } from "@/shared/contracts/domain-schemas";
const title = z.string().trim().min(1).max(300);
const id = z.uuid();
export const operation = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("create-artifact"),
    id,
    name: z.string().trim().min(1).max(160),
    artifactKind: z.enum(["image", "markdown", "software"]),
  }),
  z.object({
    kind: z.literal("milestone-add"),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000),
    templateId: z.string().max(80),
  }),
  z.object({
    kind: z.literal("milestone-edit"),
    id,
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000),
    status: z.enum(["active", "completed", "archived"]),
  }),
  z.object({ kind: z.literal("milestone-delete"), id, confirmed: z.literal(true) }),
  z.object({ kind: z.literal("milestone-order"), id, beforeId: id.nullable() }),
  z.object({
    kind: z.literal("move"),
    id,
    milestoneId: id.nullable(),
    columnId: z.string().max(80),
    beforeId: id.nullable(),
    confirmed: z.boolean().default(false),
  }),
  z.object({ kind: z.literal("attach"), id, artifactId: id, remove: z.boolean() }),
  z.object({
    kind: z.literal("add"),
    title,
    parentId: id.nullable(),
    milestoneId: id.nullable().optional(),
    columnId: z.string().max(80).optional(),
  }),
  z.object({ kind: z.literal("edit"), id, title }),
  z.object({
    kind: z.literal("status"),
    id,
    status: taskStatusSchema,
    scope: z.enum(["task", "subtree"]).default("task"),
    confirmed: z.boolean().default(false),
  }),
  z.object({ kind: z.literal("delete"), id, confirmed: z.literal(true) }),
  z.object({ kind: z.literal("collapse"), ids: z.array(id).max(2000), collapsed: z.boolean() }),
]);
export type TaskOperation = z.input<typeof operation>;
