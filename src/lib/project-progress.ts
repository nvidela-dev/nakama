import { z } from "zod";
import { queryRows } from "./query";
import { flowIdSchema, nodeStatusSchema } from "./domain-schemas";
import type { Database } from "./database";
import { flows } from "./flows";
import { ProjectError, type Actor } from "./projects";

export type StageProgress = {
  id: string;
  name: string;
  answered: number;
  total: number;
  started: boolean;
  reviewed: boolean;
  revisit: boolean;
  blocked: number;
  skipped: number;
};

// Only status metadata is needed for the cards, never answer text or review rationale.
// The membership join scopes the entire read, including its correlated subqueries.
export async function projectProgress(db: Database, actor: Actor) {
  if (!actor.userId) throw new ProjectError("Please sign in to continue.");
  const rows = await queryRows(db,z.object({project_id:z.uuid(),flow_id:flowIdSchema,template_version:z.number().int(),answers:z.array(z.object({node_id:z.string(),stage_id:z.string(),status:nodeStatusSchema,needs_review:z.boolean()})),reviews:z.array(z.object({stage_id:z.string(),reviewed:z.boolean()}))}),`SELECT f.project_id, f.flow_id, f.template_version,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'node_id', a.node_id, 'stage_id', a.stage_id,
      'status', a.status, 'needs_review', a.needs_review))
      FROM node_answers a WHERE a.project_id = f.project_id), '[]'::jsonb) AS answers,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'stage_id', r.stage_id, 'reviewed', r.reviewed))
      FROM stage_reviews r WHERE r.project_id = f.project_id), '[]'::jsonb) AS reviews
    FROM project_flows f
    JOIN project_memberships m ON m.project_id = f.project_id
    WHERE m.user_id = $1`, [actor.userId]);
  return new Map(rows.map((row) => {
    const flow = flows[row.flow_id];
    if (flow.version !== row.template_version)
      throw new ProjectError("This flow version is not supported.");
    const stages: StageProgress[] = flow.stages.map((stage) => {
      const answers = row.answers.filter((a) => a.stage_id === stage.id);
      const questions = stage.nodes.filter((n) => n.kind === "question");
      const review = row.reviews.find((r) => r.stage_id === stage.id);
      return {
        id: stage.id,
        name: stage.name,
        answered: questions.filter((n) => answers.some((a) => a.node_id === n.id && a.status === "answered")).length,
        total: questions.length,
        started: answers.some((a) => a.status !== "unanswered") || !!review,
        reviewed: review?.reviewed ?? false,
        revisit: answers.some((a) => a.needs_review) || (!!review && !review.reviewed),
        blocked: answers.filter((a) => a.status === "blocked").length,
        skipped: answers.filter((a) => a.status === "skipped").length,
      };
    });
    return [row.project_id, stages] as const;
  }));
}
