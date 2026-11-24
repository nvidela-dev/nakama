import { z } from "zod";
import { isAppAdmin } from "@/features/access/server/app-access";
import { jobStages } from "@/features/jobs/model";
import { isProspectStatus, statusLabel } from "@/features/prospects/model";
import { catalogueId } from "@/features/prospects/server/access";
import type { Queryable } from "@/server/database/database";
import { queryRows, required } from "@/server/database/query";
import type { Actor } from "@/shared/contracts/actor";
import type { HomeMetrics, HomePipelineMetrics } from "../model";

const count = z.number().int().nonnegative();
const stageCount = z.object({ stage: z.string(), count });
const explorationCounts = z.object({
  active: count,
  withFlow: count,
  withoutFlow: count,
  parked: count,
  finished: count,
});
const availability = z.object({ ready: z.boolean() });

function pipeline(
  rows: z.infer<typeof stageCount>[],
  getLabel: (stage: string) => string,
): HomePipelineMetrics {
  const stages = rows.map(({ stage, count }) => ({ stage, label: getLabel(stage), count }));
  return { active: stages.reduce((total, item) => total + item.count, 0), stages };
}

async function explorationMetrics(db: Queryable, userId: string) {
  return required(
    (
      await queryRows(
        db,
        explorationCounts,
        `
    SELECT count(*) FILTER (WHERE f.project_state IS NULL OR f.project_state='active')::int AS active,
      count(*) FILTER (WHERE f.project_state='active')::int AS "withFlow",
      count(*) FILTER (WHERE f.project_id IS NULL)::int AS "withoutFlow",
      count(*) FILTER (WHERE f.project_state='parked')::int AS parked,
      count(*) FILTER (WHERE f.project_state='finished_enough')::int AS finished
    FROM project_memberships m JOIN projects p ON p.id=m.project_id
    LEFT JOIN project_flows f ON f.project_id=p.id
    WHERE m.user_id=$1 AND NOT p.archived
  `,
        [userId],
      )
    )[0],
  );
}

async function consultancyMetrics(db: Queryable, userId: string) {
  const [schema] = await queryRows(
    db,
    availability,
    `
    SELECT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('prospects')
      AND attname='on_board' AND NOT attisdropped) AS ready
  `,
  );
  if (!schema?.ready) return null;
  const [access] = await queryRows(
    db,
    availability,
    `
    SELECT EXISTS (SELECT 1 FROM prospect_memberships
      WHERE catalogue_id=$1 AND user_id=$2 AND role='owner') AS ready
  `,
    [catalogueId, userId],
  );
  if (!access?.ready) return null;
  return pipeline(
    await queryRows(
      db,
      stageCount,
      `
    SELECT p.status::text AS stage,count(*)::int AS count
    FROM prospect_memberships m JOIN prospects p ON p.catalogue_id=m.catalogue_id
    WHERE m.catalogue_id=$1 AND m.user_id=$2 AND m.role='owner'
      AND p.assignee_id=m.user_id AND p.on_board AND p.status NOT IN ('deal','rejected')
    GROUP BY p.status ORDER BY p.status
  `,
      [catalogueId, userId],
    ),
    (stage) => (isProspectStatus(stage) ? statusLabel[stage] : stage),
  );
}

async function jobMetrics(db: Queryable, userId: string) {
  const [schema] = await queryRows(
    db,
    availability.extend({ workflow: z.boolean() }),
    `
    SELECT to_regclass('nakama_jobs.tracking') IS NOT NULL AS ready,
      to_regclass('nakama_jobs.stage_history') IS NOT NULL AS workflow
  `,
  );
  if (!schema?.ready) return null;
  // Match the Job Search board's effective stage without creating or changing history.
  const notExpired = schema.workflow
    ? `AND NOT EXISTS (
    SELECT 1 FROM nakama_jobs.stage_history h
    WHERE t.stage='waiting' AND h.owner_id=t.owner_id AND h.lead_id=t.lead_id
      AND h.ended_at IS NULL AND h.started_at + interval '336 hours' <= now()
  )`
    : "";
  return pipeline(
    await queryRows(
      db,
      stageCount,
      `
    SELECT t.stage,count(*)::int AS count FROM nakama_jobs.tracking t
    WHERE t.owner_id=$1 AND t.stage IN ('pursuing','applied','screening','interview','waiting','offer')
      AND (EXISTS (SELECT 1 FROM nakama_jobs.manual_leads m WHERE m.owner_id=t.owner_id AND m.id=t.lead_id)
        OR EXISTS (SELECT 1 FROM nakama_jobs.discoveries d WHERE d.id=t.lead_id))
      ${notExpired}
    GROUP BY t.stage ORDER BY array_position(ARRAY['pursuing','applied','screening','interview','waiting','offer'],t.stage)
  `,
      [userId],
    ),
    (stage) => Object.entries(jobStages).find(([key]) => key === stage)?.[1] ?? stage,
  );
}

export async function homeMetrics(
  db: Queryable,
  jobsDb: () => Queryable | null,
  person: Actor,
  ownerEmail: string | undefined,
): Promise<HomeMetrics> {
  if (!person.userId)
    return {
      explorations: { active: 0, withFlow: 0, withoutFlow: 0, parked: 0, finished: 0 },
      consultancy: null,
      jobs: null,
    };
  const jobDb = isAppAdmin(person, ownerEmail) ? jobsDb() : null;
  const [explorations, consultancy, jobs] = await Promise.all([
    explorationMetrics(db, person.userId),
    consultancyMetrics(db, person.userId),
    jobDb ? jobMetrics(jobDb, person.userId) : null,
  ]);
  return { explorations, consultancy, jobs };
}
