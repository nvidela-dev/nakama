import { z } from "zod";
import type { DatabaseRows } from "@/shared/contracts/database.generated";
import { membershipRoleSchema, uuidSchema } from "@/shared/contracts/domain-schemas";
export const id = uuidSchema,
  positive = z.number().int().positive();
export const projectSchema = z.object({
  id,
  linear_project_url: z.string().nullable(),
  linear_link_revision: z.number().int(),
  name: z.string(),
  description: z.string(),
  archived: z.boolean(),
  created_at: z.date(),
  role: membershipRoleSchema,
}) satisfies z.ZodType<
  DatabaseRows["projects"] & Pick<DatabaseRows["project_memberships"], "role">
>;
export const membershipSchema = z.object({ role: membershipRoleSchema });
export const memberSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  role: membershipRoleSchema,
  joined_at: z.date(),
}) satisfies z.ZodType<
  Pick<DatabaseRows["project_memberships"], "user_id" | "display_name" | "role" | "joined_at">
>;
export const countSchema = z.object({ count: z.number().int().nonnegative() });

export const cursorTimeSchema = z.object({ cursor_time: z.iso.datetime({ offset: true }) });
