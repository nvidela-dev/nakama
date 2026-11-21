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
export const event = z.object({
  kind: kinds,
  occurred_on: z.string(),
  detail: z.string(),
  practice: z.string(),
});
export const id = z.string().regex(/^(?:e-[0-9a-f]{32}|m-[0-9a-f-]{36})$/);
const date = z.iso.date();
export const commands = z.discriminatedUnion("type", [
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
    next_action: z.string().trim().max(2000),
    follow_up: date.nullable(),
  }),
  z.object({
    type: z.literal("event"),
    id,
    token: z.uuid(),
    kind: kinds,
    occurred_on: date.refine((v) => v <= jobDate()),
    detail: z.string().trim().min(1).max(8000),
    practice: z.string().trim().max(4000),
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
  observations: z.infer<typeof observation>[];
  events: z.infer<typeof event>[];
};
