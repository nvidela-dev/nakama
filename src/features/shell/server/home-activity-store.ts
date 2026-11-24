import { z } from "zod";
import { isAppAdmin } from "@/features/access/server/app-access";
import { catalogueId } from "@/features/prospects/server/access";
import type { Queryable } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
import type { Actor } from "@/shared/contracts/actor";
import type { HomeActivityItem } from "../model";

const limit = 18;
const row = z.object({
  id: z.string(),
  record_id: z.string(),
  title: z.string(),
  kind: z.string(),
  occurred_at: z.iso.datetime(),
  date_only: z.boolean().optional(),
});
const ready = z.object({ ready: z.boolean() });
const utc = `to_char(event_time AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

const destinations = {
  explorations: (id: string) => `/projects/${encodeURIComponent(id)}`,
  consultancy: (id: string) => `/prospects?business=${encodeURIComponent(id)}`,
  jobs: (id: string) => `/jobs?role=${encodeURIComponent(id)}`,
};

const actions: ReadonlyMap<string, string> = new Map([
  ["project_created", "Exploration created"],
  ["flow_selected", "Flow selected"],
  ["answer", "Answer saved"],
  ["review", "Stage reviewed"],
  ["stage", "Prospect stage changed"],
  ["call", "Call logged"],
  ["application", "Application logged"],
  ["interview", "Interview logged"],
  ["screening", "Screening logged"],
  ["outreach", "Outreach logged"],
  ["contact", "Outreach logged"],
  ["reply", "Reply logged"],
  ["offer", "Offer logged"],
  ["rejected", "Rejection logged"],
  ["withdrawn", "Withdrawal logged"],
]);

function toItems(source: HomeActivityItem["source"], rows: z.infer<typeof row>[]) {
  return rows.flatMap(
    ({ id, record_id, title, kind, occurred_at, date_only }): HomeActivityItem[] => {
      const action = actions.get(kind);
      return action
        ? [
            {
              id: `${source}:${id}`,
              source,
              title,
              action,
              href: destinations[source](record_id),
              occurredAt: occurred_at,
              ...(date_only ? { dateOnly: true } : {}),
            },
          ]
        : [];
    },
  );
}

async function explorationRows(db: Queryable, userId: string) {
  // Use current memberships, without any administrator override. Each index-backed
  // lateral branch is bounded before the final newest-first merge.
  return queryRows(
    db,
    row,
    `SELECT e.id, p.id::text AS record_id, p.name AS title, e.kind, ${utc} AS occurred_at
     FROM project_memberships m JOIN projects p ON p.id=m.project_id
     CROSS JOIN LATERAL (
       (SELECT 'event:'||id::text AS id, kind::text, created_at AS event_time FROM project_activity
        WHERE project_id=p.id AND kind IN ('project_created','flow_selected')
        ORDER BY created_at DESC,id DESC LIMIT $2)
       UNION ALL
       (SELECT 'answer:'||project_id::text||':'||node_id||':'||revision::text, 'answer', created_at
        FROM answer_revisions WHERE project_id=p.id AND origin<>'capture'
        ORDER BY created_at DESC,node_id DESC,revision DESC LIMIT $2)
       UNION ALL
       (SELECT 'review:'||id::text, 'review', created_at FROM stage_review_history
        WHERE project_id=p.id ORDER BY created_at DESC,id DESC LIMIT $2)
     ) e
     WHERE m.user_id=$1 ORDER BY event_time DESC,e.id DESC LIMIT $2`,
    [userId, limit],
  );
}

async function consultancyRows(db: Queryable, userId: string) {
  const [schema] = await queryRows(
    db,
    ready,
    "SELECT to_regclass('prospect_events') IS NOT NULL AS ready",
  );
  if (!schema?.ready) return [];
  const [access] = await queryRows(
    db,
    ready,
    `SELECT EXISTS(SELECT 1 FROM prospect_memberships WHERE catalogue_id=$1 AND user_id=$2 AND role='owner') AS ready`,
    [catalogueId, userId],
  );
  if (!access?.ready) return [];
  // Recheck in the same statement that returns event data. Do not use the normal
  // catalogue opening path, which can consume invitations/create memberships.
  return queryRows(
    db,
    row,
    `SELECT e.id::text, p.id::text AS record_id, p.name AS title, e.kind::text, ${utc} AS occurred_at
     FROM prospect_memberships m JOIN prospect_events e USING (catalogue_id)
     JOIN prospects p ON p.catalogue_id=e.catalogue_id AND p.id=e.prospect_id
     CROSS JOIN LATERAL (SELECT e.created_at AS event_time) time
     WHERE m.catalogue_id=$1 AND m.user_id=$2 AND m.role='owner' AND e.kind::text IN ('call','stage')
     ORDER BY event_time DESC,e.id DESC LIMIT $3`,
    [catalogueId, userId, limit],
  );
}

async function jobRows(db: Queryable, userId: string) {
  const [schema] = await queryRows(
    db,
    ready.extend({ workflow: z.boolean() }),
    `SELECT to_regclass('nakama_jobs.events') IS NOT NULL AS ready,
            to_regclass('nakama_jobs.stage_history') IS NOT NULL AS workflow`,
  );
  if (!schema?.ready) return [];
  // The exact contact timestamp, when present, takes precedence over a
  // recorded calendar date. Old events only have a local date.
  const contactTime = schema.workflow ? "e.contact_at" : "NULL::timestamptz";
  return queryRows(
    db,
    row,
    `SELECT e.id::text, e.lead_id AS record_id,
      concat_ws(' · ', coalesce(m.title,d.title), coalesce(m.company,d.company)) AS title,
      e.kind, ${utc} AS occurred_at, ${contactTime} IS NULL AS date_only
     FROM nakama_jobs.events e
     LEFT JOIN nakama_jobs.manual_leads m ON m.id=e.lead_id AND m.owner_id=e.owner_id
     LEFT JOIN nakama_jobs.discoveries d ON d.id=e.lead_id
     CROSS JOIN LATERAL (
       SELECT coalesce(${contactTime}, e.occurred_on::timestamp AT TIME ZONE 'America/Montevideo') AS event_time
     ) time
     WHERE e.owner_id=$1 AND (m.id IS NOT NULL OR d.id IS NOT NULL)
       AND e.kind IN ('application','interview','screening','outreach','contact','reply','offer','rejected','withdrawn')
     ORDER BY event_time DESC,e.recorded_at DESC,e.id DESC LIMIT $2`,
    [userId, limit],
  );
}

export async function homeActivity(
  db: Queryable,
  jobsDb: () => Queryable | null,
  person: Actor,
  ownerEmail: string | undefined,
): Promise<HomeActivityItem[]> {
  if (!person.userId) return [];
  const jobs = isAppAdmin(person, ownerEmail) ? jobsDb() : null;
  const [explorations, prospects, roles] = await Promise.all([
    explorationRows(db, person.userId),
    consultancyRows(db, person.userId),
    jobs ? jobRows(jobs, person.userId) : [],
  ]);
  return [
    ...toItems("explorations", explorations),
    ...toItems("consultancy", prospects),
    ...toItems("jobs", roles),
  ]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
}
