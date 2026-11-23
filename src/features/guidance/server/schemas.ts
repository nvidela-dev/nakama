import { z } from "zod";
import type { DatabaseRows } from "@/shared/contracts/database.generated";
import {
  flowIdSchema,
  nodeStatusSchema,
  projectStateSchema,
  revisionOriginSchema,
} from "@/shared/contracts/domain-schemas";
import { positive } from "@/server/database/row-schemas";
export const answerSchema = z.object({
  node_id: z.string(),
  stage_id: z.string(),
  revision: positive,
  content: z.string(),
  status: nodeStatusSchema,
  choice: z.string().nullable(),
  needs_review: z.boolean(),
  updated_by: z.string(),
  updated_at: z.date(),
}) satisfies z.ZodType<Omit<DatabaseRows["node_answers"], "project_id">>;
export const revisionSchema = z.object({
  revision: positive,
  content: z.string(),
  status: nodeStatusSchema,
  choice: z.string().nullable(),
  author_id: z.string(),
  origin: revisionOriginSchema,
  created_at: z.date(),
}) satisfies z.ZodType<Omit<DatabaseRows["answer_revisions"], "project_id" | "node_id">>;
export const stageReviewSchema = z.object({
  stage_id: z.string(),
  reviewed: z.boolean(),
  rationale: z.string(),
  reviewed_by: z.string(),
  reviewed_at: z.date(),
}) satisfies z.ZodType<Omit<DatabaseRows["stage_reviews"], "project_id">>;
export const selectedFlowSchema = z.object({
  flow_id: flowIdSchema,
  template_version: z.number().int().positive(),
  project_state: projectStateSchema,
  content_revision: z.number().int().nonnegative(),
}) satisfies z.ZodType<
  Pick<
    DatabaseRows["project_flows"],
    "flow_id" | "template_version" | "project_state" | "content_revision"
  >
>;
