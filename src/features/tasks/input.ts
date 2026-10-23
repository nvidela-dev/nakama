import { z } from "zod";
import { taskStatusSchema } from "@/shared/contracts/domain-schemas";
const title = z.string().trim().min(1).max(300);
const id = z.uuid();
export const operation = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("add"), title, parentId: id.nullable() }),
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
