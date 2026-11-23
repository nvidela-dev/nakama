import type { ResumeMatch } from "./resume-match";
import { z } from "zod";
import { jobStages, jobEvents, sourceLink, jobDate } from "./model";
export const nullable = z.string().nullable();
export const leadSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  url: nullable,
  found_on: z.iso.date().nullable(),
  first_observed: nullable,
  first_seen_raw: nullable,
  last_checked: nullable,
  availability: z.enum(["current", "historical", "unknown"]),
  relevance: nullable,
  company_type: nullable,
  employment: nullable,
  startup: z.boolean().nullable(),
  stage: z
    .enum(Object.keys(jobStages) as [keyof typeof jobStages, ...(keyof typeof jobStages)[]])
    .nullable(),
  waiting_since: nullable,
  next_action: z.string(),
  follow_up: nullable,
  revision: z.number(),
  linear_url: nullable,
});
export type JobLead = z.infer<typeof leadSchema>;
export const observation = z.object({
  observed_date: nullable,
  status_observed: nullable,
  source_url: nullable,
  historical: z.boolean(),
  relevance: nullable,
  classification_evidence: nullable,
  evidence_text: nullable,
});
const kinds = z.enum(
  Object.keys(jobEvents) as [keyof typeof jobEvents, ...(keyof typeof jobEvents)[]],
);
const roundFields = {
  round_type: z.string().trim().min(1).max(200),
  round_outcome: z.string().trim().min(1).max(500),
  rating: z.number().int().min(1).max(10),
};
const outreachFields = {
  contact_method: z.enum(["call", "email", "message"]),
  direction: z.enum(["inbound", "outbound"]),
  response: z.enum(["reply", "no_reply"]),
  contact_at: z.iso.datetime({ local: true }).refine((v) => !v.endsWith("Z")),
  follow_up: z.iso.date().nullable(),
  decision: z.enum(["accepted", "rejected"]).optional(),
  revision: z.number().int().nonnegative().optional(),
};
export const stagePeriod = z.object({
  stage: leadSchema.shape.stage.unwrap(),
  started_at: z.string(),
});
export const event = z.object({
  kind: kinds,
  round_type: nullable,
  round_outcome: nullable,
  rating: roundFields.rating.nullable(),
  contact_method: outreachFields.contact_method.nullable(),
  direction: outreachFields.direction.nullable(),
  response: outreachFields.response.nullable(),
  contact_at: nullable,
  follow_up: nullable,
  occurred_on: z.string(),
  detail: z.string(),
  practice: z.string(),
});
export const id = z.string().regex(/^(?:e-[0-9a-f]{32}|m-[0-9a-f-]{36})$/);
const date = z.iso.date();
const baseCommands = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add"),
    token: z.uuid(),
    listed_skills: z.string().trim().max(2000).optional(),
    found_on: date.refine((v) => v <= jobDate()).optional(),
    company: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(250),
    url: z
      .string()
      .max(2000)
      .refine((v) => !v || !!sourceLink(v)),
    relevance: z.string().trim().max(2000),
  }),
  z.object({
    type: z.literal("plan"),
    id,
    revision: z.number().int().nonnegative(),
    stage: leadSchema.shape.stage,
    previous_stage: leadSchema.shape.stage.optional(),
    next_action: z.string().trim().max(2000),
    follow_up: date.nullable(),
  }),
]);
const eventCommand = z.object({
  type: z.literal("event"),
  id,
  token: z.uuid(),
  occurred_on: date.refine((v) => v <= jobDate()),
  detail: z.string().trim().min(1).max(8000),
  practice: z.string().trim().max(4000),
});
export const commands = z.union([
  baseCommands,
  eventCommand.extend({ kind: z.enum(["screening", "interview"]), ...roundFields }),
  eventCommand
    .extend({ kind: z.literal("outreach"), ...outreachFields })
    .refine(
      (c) =>
        c.contact_at.slice(0, 10) === c.occurred_on &&
        (!c.decision ||
          (c.revision !== undefined && (c.direction === "inbound" || c.response === "reply"))),
    ),
  eventCommand.extend({
    kind: z.enum([
      "application",
      "feedback",
      "offer",
      "rejected",
      "withdrawn",
      "note",
      "contact",
      "reply",
    ]),
  }),
]);
export type JobCommand = z.input<typeof commands>;
export type JobSort = "date" | "match";
export type JobFilters = {
  sort?: JobSort;
  direction?: "asc" | "desc";
  found: string;
  query: string;
  availability: string;
  employer: string;
  contract: string;
  startup: string;
  source: string;
  board: boolean;
  page: number;
};
export type JobDetailData = {
  lead: JobLead;
  match: ResumeMatch;
  stages: z.infer<typeof stagePeriod>[];
  observations: z.infer<typeof observation>[];
  events: z.infer<typeof event>[];
};
