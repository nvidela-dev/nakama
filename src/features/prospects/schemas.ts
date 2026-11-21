import { z } from "zod";
import {
  ProspectEventKindValues,
  ProspectStatusValues,
} from "@/shared/contracts/database.generated";

import { outreachKinds } from "./model";
export const prospectSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  details: z.string(),
  status: z.enum(ProspectStatusValues),
  revision: z.number().int(),
  assignee_id: z.string().nullable(),
  assignee_name: z.string().nullable(),
  called: z.boolean(),
  latest_outcome: z.string().nullable(),
});
export const eventSchema = z.object({
  id: z.string(),
  kind: z.enum(ProspectEventKindValues),
  actor_name: z.string(),
  outcome: z.enum(["deal", "rejected"]).nullable(),
  previous_assignee: z.string().nullable(),
  next_assignee: z.string().nullable(),
  note: z.string(),
  created_at: z.coerce.date(),
  profile_changes: z.record(z.string(), z.json()).nullable(),
});
const input = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(300),
  details: z.string().trim().max(2000),
});
const change = z.object({ id: z.uuid(), revision: z.number().int().nonnegative() });
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add"), record: input }),
  change
    .extend({
      type: z.literal("profile"),
      name: z.string().trim().min(1).max(300).optional(),
      details: z.string().max(100000).optional(),
      research: z.record(z.string().max(200), z.json()).optional(),
    })
    .refine((c) => c.name !== undefined || c.details !== undefined || c.research !== undefined),
  change.extend({ type: z.literal("assign"), assignee: z.string().min(1).max(256).nullable() }),
  change.extend({
    type: z.literal("log"),
    kind: z.enum(outreachKinds),
    outcome: z.enum(["deal", "rejected"]).optional(),
    note: z.string().trim().min(1).max(2000),
  }),
  z.object({ type: z.literal("invite"), email: z.email().max(254) }),
  z.object({ type: z.literal("cancel_invite"), email: z.email().max(254) }),
  z.object({ type: z.literal("remove"), userId: z.string().min(1).max(256) }),
  z.object({
    type: z.literal("share"),
    id: z.uuid(),
    userId: z.string().min(1).max(256),
    enabled: z.boolean(),
  }),
  z.object({ type: z.literal("access"), userId: z.string().min(1).max(256), enabled: z.boolean() }),
]);
