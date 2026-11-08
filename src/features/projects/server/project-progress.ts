import { z } from "zod";
import { queryRows } from "@/server/database/query";
import { flowIdSchema, nodeStatusSchema } from "@/shared/contracts/domain-schemas";
import type { Database } from "@/server/database/database";
import { flows } from "@/features/guidance/model/flows";
import { ProjectError, type Actor } from "@/features/projects/server/projects";

import type { StageProgress } from "@/features/projects/model";
export type { StageProgress } from "@/features/projects/model";
// Only status metadata is needed for the cards, never answer text or review rationale.
// The membership join scopes the entire read, including its correlated subqueries.
export async function projectProgress(db: Database, actor: Actor) {
  if (!actor.userId) throw new ProjectError("Please sign in to continue.");
  const rows = await queryRows(
    db,
    z.object({
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
    }),
    `SELECT f.project_id, f.flow_id, f.template_version,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'node_id', a.node_id, 'stage_id', a.stage_id,
      'status', a.status, 'needs_review', a.needs_review))
      FROM node_answers a WHERE a.project_id = f.project_id), '[]'::jsonb) AS answers,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'stage_id', r.stage_id, 'reviewed', r.reviewed))
      FROM stage_reviews r WHERE r.project_id = f.project_id), '[]'::jsonb) AS reviews
    FROM project_flows f
    JOIN project_memberships m ON m.project_id = f.project_id
    WHERE m.user_id = $1`,
    [actor.userId],
  );
  return new Map(
    rows.map((row) => {
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
          answered: questions.filter((n) =>
            answers.some((a) => a.node_id === n.id && a.status === "answered"),
          ).length,
          total: questions.length,
          started: answers.some((a) => a.status !== "unanswered") || !!review,
          reviewed: review?.reviewed ?? false,
          revisit: answers.some((a) => a.needs_review) || (!!review && !review.reviewed),
          blocked: answers.filter((a) => a.status === "blocked").length,
          skipped: answers.filter((a) => a.status === "skipped").length,
        };
      });
      return [row.project_id, stages] as const;
    }),
  );
}

// Aggregate each child relation independently. Joining task rows to run rows would inflate both counts.
export async function projectActivityCounts(db: Database, actor: Actor) {
  if (!actor.userId) throw new ProjectError("Please sign in to continue.");
  const count = z.number().int().nonnegative();
  const rows = await queryRows(
    db,
    z.object({
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
    }),
    `SELECT m.project_id AS id, ms.*, t.*, e.*, s.*
      FROM project_memberships m
      CROSS JOIN LATERAL (SELECT count(*)::int AS milestones,
        count(*) FILTER(WHERE status='completed')::int AS covered
        FROM project_milestones WHERE project_id=m.project_id) ms
      CROSS JOIN LATERAL (SELECT count(*)::int AS tasks, count(*) FILTER(WHERE status<>'done')::int AS open_tasks
        FROM project_tasks WHERE project_id=m.project_id) t
      CROSS JOIN LATERAL (SELECT count(*)::int AS experiments,
        count(*) FILTER(WHERE run.status='running')::int AS active,
        count(*) FILTER(WHERE run.status='completed')::int AS completed
        FROM experiments x LEFT JOIN LATERAL (
          SELECT r.status FROM experiment_runs r JOIN experiment_plans p ON (p.project_id,p.experiment_id,p.id)=(r.project_id,r.experiment_id,r.plan_id)
          WHERE r.project_id=x.project_id AND r.experiment_id=x.id AND p.version=(SELECT max(version) FROM experiment_plans WHERE experiment_id=x.id)
          ORDER BY (r.status='running') DESC, r.started_at DESC,r.id DESC LIMIT 1
        ) run ON TRUE WHERE x.project_id=m.project_id) e
      CROSS JOIN LATERAL (SELECT count(*)::int AS shirts,count(DISTINCT lower(collection))::int AS collections
        FROM shirt_designs WHERE project_id=m.project_id) s
      WHERE m.user_id=$1`,
    [actor.userId],
  );
  return new Map(rows.map((row) => [row.id, row]));
}
