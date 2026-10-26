import { z } from "zod";
import {
  LabAssessmentValues,
  LabNextActionValues,
  LabEvidenceKindValues,
} from "@/shared/contracts/database.generated";
const text = z.string().trim().min(1).max(12000);
const optional = z.string().trim().max(4000).default("");
export const planSchema = z.object({
  claim: text,
  method: text,
  criteria: text,
  scope: optional,
  metric: optional,
  baseline: optional,
  owner: optional,
  limits: optional,
  milestone: optional,
  nodeId: z.string().max(150).default(""),
});
const run = { runId: z.uuid() };
export const operationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("plan"), plan: planSchema }),
  z.object({ kind: z.literal("start"), executor: text }),
  z.object({
    kind: z.literal("finish"),
    ...run,
    status: z.enum(["completed", "cancelled"]),
    effortMinutes: z.number().int().min(0).max(10000000).nullable(),
    cost: optional,
    deviations: optional,
  }),
  z.object({
    kind: z.literal("evidence"),
    ...run,
    evidenceKind: z.enum(LabEvidenceKindValues),
    content: text,
    source: text,
    measurement: optional,
    unit: optional,
  }),
  z.object({
    kind: z.literal("review"),
    ...run,
    assessment: z.enum(LabAssessmentValues),
    nextAction: z.enum(LabNextActionValues),
    rationale: text,
    reconciliation: optional,
  }),
  z.object({ kind: z.literal("propose"), ...run, agent: text, content: text, source: text }),
  z.object({
    kind: z.literal("resolve"),
    proposalId: z.uuid(),
    decision: z.enum(["accepted", "edited", "rejected"]),
    content: z.string().trim().max(12000).default(""),
    note: text,
    acknowledgeStale: z.boolean().default(false),
  }),
]);
export type Plan = z.infer<typeof planSchema>;
export type LabOperation = z.infer<typeof operationSchema>;
