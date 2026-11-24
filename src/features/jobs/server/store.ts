import { recordEvent } from "./record-event";
import { z } from "zod";
import type { Database, Queryable } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
import type { Actor } from "@/shared/contracts/actor";
import { isAppAdmin } from "@/features/access/server/app-access";
import { ProjectError } from "@/shared/contracts/errors";
import { resumeMatch, type ResumeMatch } from "../resume-match";
import { foundRange } from "../discovery-weeks";
import { availabilityLabels, finishedStages, jobDate, jobPageSize, originalStages } from "../model";

import {
  commands,
  event,
  id,
  leadSchema,
  observation,
  stagePeriod,
  nullable,
  type JobCommand,
  type JobFilters,
} from "../schemas";
function pageFor(requested: number, total: number) {
  return Math.max(1, Math.min(requested, Math.ceil(total / jobPageSize) || 1));
}
const pagedLeads = z.object({ total: z.number(), page: z.number(), leads: z.array(leadSchema) });
const ghostDeadline = "h.started_at + interval '336 hours'";
const expiredWait = `t.stage='waiting' AND ${ghostDeadline} <= now()`;
const effectiveStage = `CASE WHEN ${expiredWait} THEN 'ghosted' ELSE t.stage END`;
const finishedAt = `CASE WHEN ${expiredWait} THEN ${ghostDeadline}
  WHEN t.stage IN ('accepted','rejected','closed') AND h.stage=t.stage THEN h.started_at END`;
const openInterval =
  "LEFT JOIN nakama_jobs.stage_history h ON h.owner_id=t.owner_id AND h.lead_id=t.lead_id AND h.ended_at IS NULL";
export function jobsStore(
  db: Database,
  person: Actor,
  ownerEmail: string | undefined,
  workflowReady = true,
) {
  if (!isAppAdmin(person, ownerEmail)) throw new ProjectError("Jobs are private.");
  const owner = person.userId;
  const catalogue = `WITH leads AS (
 SELECT d.*, f.found_on FROM nakama_jobs.discoveries d LEFT JOIN nakama_jobs.found_dates f USING (id)
 UNION ALL SELECT id,company,title,url,first_observed,NULL,NULL,'unknown',relevance,NULL,NULL,NULL,first_observed FROM nakama_jobs.manual_leads WHERE owner_id=$1
), cards AS (
 SELECT l.id,l.company,l.title,l.url,l.found_on::text,l.first_observed::text,l.first_seen_raw,l.last_checked::text,l.availability,l.relevance,l.company_type,l.employment,l.startup,
 ${workflowReady ? effectiveStage : "t.stage"} AS stage,
 ${workflowReady ? "CASE WHEN t.stage='waiting' THEN to_char(h.started_at AT TIME ZONE 'America/Montevideo','YYYY-MM-DD HH24:MI') END" : "NULL::text"} AS waiting_since,
 ${workflowReady ? `to_char((${finishedAt}) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` : "NULL::text"} AS finished_at,
 coalesce(t.next_action,'') AS next_action,t.follow_up::text,coalesce(t.revision,0) AS revision,t.linear_url
 FROM leads l LEFT JOIN nakama_jobs.tracking t ON t.lead_id=l.id AND t.owner_id=$1
 ${workflowReady ? openInterval : ""}
)`;
  async function matchesFor(leads: { id: string; title: string }[]) {
    const result = new Map<string, ResumeMatch>();
    if (!leads.length) return result;
    const ids = leads.map((lead) => lead.id);
    const [profiles, evidence] = await Promise.all([
      queryRows(
        db,
        z.object({ skills: z.array(z.string()) }),
        "SELECT skills FROM nakama_jobs.resume_profiles WHERE owner_id=$1",
        [owner],
      ),
      queryRows(
        db,
        z.object({ lead_id: z.string(), description: z.string() }),
        `SELECT lead_id, description FROM nakama_jobs.role_requirements WHERE lead_id=ANY($1::text[])
         UNION ALL SELECT id,listed_skills FROM nakama_jobs.manual_leads WHERE id=ANY($1::text[])
         AND owner_id=$2 AND listed_skills IS NOT NULL`,
        [ids, owner],
      ),
    ]);
    const profile = profiles[0] ? new Set(profiles[0].skills) : null;
    const byLead = Map.groupBy(evidence, (row) => row.lead_id);
    for (const lead of leads) {
      const roleText = [lead.title, ...(byLead.get(lead.id) ?? []).map((r) => r.description)].join(
        "\n",
      );
      result.set(lead.id, resumeMatch(profile, roleText));
    }
    return result;
  }
  async function get(tx: Queryable, key: string) {
    if (!id.safeParse(key).success) throw new ProjectError("Role not found.");
    const [lead] = await queryRows(tx, leadSchema, catalogue + " SELECT * FROM cards WHERE id=$2", [
      owner,
      key,
    ]);
    if (!lead) throw new ProjectError("Role not found.");
    return lead;
  }
  async function track(tx: Queryable, key: string) {
    await get(tx, key);
    await tx.query(
      "INSERT INTO nakama_jobs.tracking(owner_id,lead_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [owner, key],
    );
  }
  return {
    workflowReady,
    async browse(filters: JobFilters, today = jobDate()) {
      const { query, availability, employer, contract, startup } = filters;
      const finished = filters.finished === true;
      const board = filters.board && !finished;
      const stage = finishedStages.find((value) => value === filters.finishedStage) ?? "";
      const found = board || finished ? "" : filters.found;
      const range = foundRange(found, today);
      const where = ` WHERE ($2='' OR strpos(lower(concat_ws(' ',title,company,relevance,url)),lower($2))>0)
 AND ($3='' OR availability=$3) AND ($4='' OR CASE WHEN lower(company_type) ~ '^(product|own.product|direct)' THEN 'direct' WHEN lower(company_type) ~ '^(consult|intermed|staffing|client delivery)' THEN 'agency' ELSE 'unknown' END=$4)
 AND ($5='' OR strpos(lower(coalesce(employment,'')),lower($5))>0)
 AND ($6='' OR coalesce(startup::text,'unknown')=$6) AND ($7='backlog' OR CASE WHEN $7='finished' THEN stage=ANY($12::text[]) AND ($13='' OR stage=$13)
      ELSE stage<>ALL($12::text[]) END)
 AND ($8 <> 'linkedin' OR url ~* '^https?://([a-z0-9-]+[.])*(linkedin[.]com|lnkd[.]in)([/:?#]|$)' OR EXISTS (SELECT 1 FROM nakama_jobs.evidence se WHERE se.lead_id=cards.id AND se.from_linkedin))
 AND (NOT $9::boolean OR found_on IS NULL) AND ($10::text IS NULL OR found_on >= $10) AND ($11::text IS NULL OR found_on < $11)`;
      const values = [
        owner,
        query.slice(0, 250),
        Object.hasOwn(availabilityLabels, availability) ? availability : "",
        employer,
        contract.slice(0, 100),
        startup,
        finished ? "finished" : board ? "active" : "backlog",
        filters.source,
        found === "unknown",
        range?.since ?? null,
        range?.until ?? null,
        [...finishedStages],
        stage,
      ];
      const selection = catalogue + " SELECT * FROM cards" + where;
      const ascending = filters.direction === "asc";
      const dateOrder = (oldestFirst: boolean) =>
        `${finished ? "finished_at" : "found_on"} ${oldestFirst ? "ASC" : "DESC"} NULLS LAST,company,title,id`;
      if (!board && filters.sort === "match") {
        // Scoring uses the same evidence as the visible meter. Sort all filtered roles
        // before paging; stable ties keep the newest discovery first.
        const candidates = await queryRows(
          db,
          leadSchema,
          selection + " ORDER BY " + dateOrder(false),
          values,
        );
        const matches = await matchesFor(candidates);
        const page = pageFor(filters.page, candidates.length);
        candidates.sort((a, b) => {
          const left = matches.get(a.id)!;
          const right = matches.get(b.id)!;
          if (left.status !== "scored") return right.status === "scored" ? 1 : 0;
          if (right.status !== "scored") return -1;
          return ascending ? left.percent - right.percent : right.percent - left.percent;
        });
        const rows = candidates.slice((page - 1) * jobPageSize, page * jobPageSize);
        return { rows, total: candidates.length, page, matches };
      }
      if (board) {
        const rows = await queryRows(
          db,
          leadSchema,
          selection +
            " ORDER BY last_checked DESC NULLS LAST, first_observed DESC NULLS LAST, company,title,id",
          values,
        );
        return {
          rows,
          total: rows.length,
          page: pageFor(filters.page, rows.length),
          matches: new Map<string, ResumeMatch>(),
        };
      }
      // Build the expensive discovery/found-date view and apply the filters once. An
      // aggregate result also preserves the exact total and clamped page on zero hits.
      const order = dateOrder(ascending);
      const [result] = await queryRows(
        db,
        pagedLeads,
        catalogue +
          `, filtered AS MATERIALIZED (SELECT * FROM cards${where}),
             counted AS (SELECT count(*)::int AS total FROM filtered),
             bounds AS (
               SELECT total, greatest(1,least($14::bigint, (total::bigint+${jobPageSize - 1})/${jobPageSize}))::int AS page
               FROM counted
             )
             SELECT total,page,
               coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY ${order}) FROM (
                 SELECT * FROM filtered ORDER BY ${order} LIMIT ${jobPageSize}
                 OFFSET (SELECT (page::bigint-1)*${jobPageSize} FROM bounds)
               ) AS r), '[]'::jsonb) AS leads
             FROM bounds`,
        [...values, Math.min(filters.page, Number.MAX_SAFE_INTEGER)],
      );
      if (!result) throw new Error("Missing jobs results.");
      const { leads: rows, total, page } = result;
      return { rows, total, page, matches: await matchesFor(rows) };
    },
    async detail(key: string) {
      const lead = await get(db, key);
      const [matches, observations, events, stages] = await Promise.all([
        matchesFor([lead]),
        queryRows(
          db,
          observation,
          "SELECT observed_date::text,status_observed,source_url,historical,relevance,classification_evidence,evidence_text FROM nakama_jobs.evidence WHERE lead_id=$1 ORDER BY observed_date DESC NULLS LAST,observation_key",
          [key],
        ),
        queryRows(
          db,
          event,
          workflowReady
            ? `SELECT kind,occurred_on::text,detail,practice,round_type,round_outcome,rating,contact_method,direction,response,
           to_char(contact_at AT TIME ZONE 'America/Montevideo','YYYY-MM-DD HH24:MI') AS contact_at, follow_up::text
           FROM nakama_jobs.events WHERE owner_id=$1 AND lead_id=$2 ORDER BY occurred_on DESC,coalesce(contact_at,recorded_at) DESC,id DESC`
            : `SELECT kind,occurred_on::text,detail,practice,NULL AS round_type,NULL AS round_outcome,NULL AS rating,NULL AS contact_method,NULL AS direction,NULL AS response,NULL AS contact_at,NULL AS follow_up
           FROM nakama_jobs.events WHERE owner_id=$1 AND lead_id=$2 ORDER BY occurred_on DESC,recorded_at DESC,id DESC`,
          [owner, key],
        ),
        workflowReady
          ? queryRows(
              db,
              stagePeriod,
              `WITH history AS (
           SELECT * FROM nakama_jobs.stage_history WHERE owner_id=$1 AND lead_id=$2
         ), changes AS (
           SELECT stage,started_at,id FROM history
           UNION ALL SELECT 'ghosted',started_at + interval '336 hours',id FROM history
             WHERE stage='waiting' AND started_at + interval '336 hours' <= coalesce(ended_at,now())
         ) SELECT stage,to_char(started_at AT TIME ZONE 'America/Montevideo','YYYY-MM-DD HH24:MI') AS started_at
           FROM changes ORDER BY changes.started_at DESC, id DESC`,
              [owner, key],
            )
          : [],
      ]);
      return { workflowReady, lead, match: matches.get(lead.id)!, observations, events, stages };
    },
    async change(raw: JobCommand) {
      const result = commands.safeParse(raw);
      if (!result.success) throw new ProjectError("Check the role details and dates.");
      const c = result.data;
      return db.transaction(async (tx) => {
        if (c.type === "add") {
          const key = "m-" + c.token;
          await tx.query(
            "INSERT INTO nakama_jobs.manual_leads(id,owner_id,company,title,url,first_observed,relevance,listed_skills) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING",
            [
              key,
              owner,
              c.company,
              c.title,
              c.url || null,
              c.found_on ?? jobDate(),
              c.relevance || null,
              c.listed_skills || null,
            ],
          );
          await get(tx, key);
          return key;
        }
        await track(tx, c.id);
        if (c.type === "legacy_event" || (!workflowReady && c.type === "event")) {
          if (c.type !== "legacy_event" || workflowReady)
            throw new ProjectError("Refresh the role before recording this event.");
          await tx.query(
            "INSERT INTO nakama_jobs.events(id,owner_id,lead_id,kind,occurred_on,detail,practice) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
            [c.token, owner, c.id, c.kind, c.occurred_on, c.detail, c.practice],
          );
          return c.id;
        }
        // Serialize plan edits and incoming responses for this owner and role.
        await tx.query(
          "SELECT revision FROM nakama_jobs.tracking WHERE owner_id=$1 AND lead_id=$2 FOR UPDATE",
          [owner, c.id],
        );
        const [current] = await queryRows(
          tx,
          leadSchema.pick({ stage: true, revision: true }),
          `SELECT ${workflowReady ? effectiveStage : "t.stage"} AS stage,t.revision FROM nakama_jobs.tracking t ${workflowReady ? openInterval : ""}
           WHERE t.owner_id=$1 AND t.lead_id=$2`,
          [owner, c.id],
        );
        if (!current) throw new ProjectError("Role not found.");
        if (c.type === "event") return recordEvent(tx, owner, current, c);
        if (c.previous_stage !== undefined && c.previous_stage !== current.stage)
          throw new ProjectError("This role changed in another tab. Reload before saving.");
        if (!workflowReady && c.stage && !originalStages.has(c.stage))
          throw new ProjectError("Choose a current job stage.");
        if (workflowReady && c.stage !== current.stage) {
          if (c.stage === "ghosted" || c.stage === "offer" || c.stage === "closed")
            throw new ProjectError("Choose a current job stage.");
          await tx.query(
            "UPDATE nakama_jobs.stage_history SET ended_at=now() WHERE owner_id=$1 AND lead_id=$2 AND ended_at IS NULL",
            [owner, c.id],
          );
          if (c.stage)
            await tx.query(
              "INSERT INTO nakama_jobs.stage_history(owner_id,lead_id,stage) VALUES($1,$2,$3)",
              [owner, c.id, c.stage],
            );
        }
        const changed = await queryRows(
          tx,
          z.object({ revision: z.number() }),
          "UPDATE nakama_jobs.tracking SET stage=$3,next_action=$4,follow_up=$5,revision=revision+1 WHERE owner_id=$1 AND lead_id=$2 AND revision=$6 RETURNING revision",
          [
            owner,
            c.id,
            c.stage === "ghosted" ? "waiting" : c.stage,
            c.next_action,
            c.follow_up,
            c.revision,
          ],
        );
        if (!changed.length)
          throw new ProjectError("This role changed in another tab. Reload before saving.");
        return c.id;
      });
    },
    async linearSlot(key: string) {
      return db.transaction(async (tx) => {
        await track(tx, key);
        const [slot] = await queryRows(
          tx,
          z.object({ linear_id: z.uuid(), linear_url: nullable }),
          "SELECT linear_id,linear_url FROM nakama_jobs.tracking WHERE owner_id=$1 AND lead_id=$2",
          [owner, key],
        );
        return slot!;
      });
    },
    async link(key: string, url: string) {
      await get(db, key);
      await db.query(
        "UPDATE nakama_jobs.tracking SET linear_url=$3 WHERE owner_id=$1 AND lead_id=$2 AND linear_url IS NULL",
        [owner, key, url],
      );
    },
  };
}
