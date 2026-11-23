import type { LinkedProject } from "../model";
import { flowIdSchema, nodeStatusSchema } from "@/shared/contracts/domain-schemas";
import { z } from "zod";
import type { DatabaseRows } from "@/shared/contracts/database.generated";
import { id } from "@/server/database/row-schemas";
export const invitationSchema = z.object({
  id,
  email: z.string(),
  expires_at: z.date(),
  accepted_at: z.date().nullable(),
  revoked_at: z.date().nullable(),
}) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_invitations"],
    "id" | "email" | "expires_at" | "accepted_at" | "revoked_at"
  >
>;
export const invitationAcceptanceSchema = invitationSchema
  .pick({ email: true, revoked_at: true })
  .extend({
    project_id: id,
    invited_by: z.string(),
    accepted_by: z.string().nullable(),
    expired: z.boolean(),
  }) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_invitations"],
    "email" | "revoked_at" | "project_id" | "invited_by" | "accepted_by"
  > & { expired: boolean }
>;

const count = z.number().int().nonnegative();

export const projectProgressSchema = z.object({
  project_id: z.uuid(),
  flow_id: flowIdSchema,
  template_version: z.number().int(),
  answers: z.array(
    z.object({
      node_id: z.string(),
      stage_id: z.string(),
      status: nodeStatusSchema,
      needs_review: z.boolean(),
    }),
  ),
  reviews: z.array(z.object({ stage_id: z.string(), reviewed: z.boolean() })),
});

export const milestoneProgressSchema = z.object({
  id: z.uuid(),
  milestones: count,
  covered: count,
  tasks: count,
  open_tasks: count,
  experiments: count,
  active: count,
  completed: count,
  shirts: count,
  collections: count,
});

export const projectLinkSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  direction: z.enum(["source", "child"]),
}) satisfies z.ZodType<LinkedProject & { direction: "source" | "child" }>;

export const cycleMatchSchema = z.object({ found: z.literal(1) }) satisfies z.ZodType<{ found: 1 }>;

export const flowCountSchema = z.object({
  flow_id: flowIdSchema.nullable(),
  total: z.number().int(),
}) satisfies z.ZodType<{ flow_id: DatabaseRows["project_flows"]["flow_id"] | null; total: number }>;
