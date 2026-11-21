import { z } from "zod";
import type { Database, Queryable } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
import type { Actor } from "@/shared/contracts/actor";
import { isAppAdmin } from "@/features/access/server/app-access";
import { ProjectError } from "@/shared/contracts/errors";
import { foundRange } from "../discovery-weeks";
import { availabilityLabels, jobDate } from "../model";

import {
  commands,
  event,
  id,
  leadSchema,
  observation,
  nullable,
  type JobCommand,
  type JobFilters,
} from "../schemas";
const catalogue = `WITH leads AS (
 SELECT d.*, f.found_on FROM nakama_jobs.discoveries d LEFT JOIN nakama_jobs.found_dates f USING (id)
 UNION ALL SELECT id,company,title,url,first_observed,NULL,NULL,'unknown',relevance,NULL,NULL,NULL,first_observed FROM nakama_jobs.manual_leads WHERE owner_id=$1
), cards AS (
 SELECT l.id,l.company,l.title,l.url,l.found_on::text,l.first_observed::text,l.first_seen_raw,l.last_checked::text,l.availability,l.relevance,l.company_type,l.employment,l.startup,t.stage,coalesce(t.next_action,'') AS next_action,t.follow_up::text,coalesce(t.revision,0) AS revision,t.linear_url
 FROM leads l LEFT JOIN nakama_jobs.tracking t ON t.lead_id=l.id AND t.owner_id=$1
)`;
export function jobsStore(db: Database, person: Actor, ownerEmail: string | undefined) {
  if (!isAppAdmin(person, ownerEmail)) throw new ProjectError("Jobs are private.");
  const owner = person.userId;
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
    async browse(filters: JobFilters, today = jobDate()) {
      const { query, availability, employer, contract, startup, board } = filters;
      const found = board ? "" : filters.found;
      const range = foundRange(found, today);
      const where = ` WHERE ($2='' OR strpos(lower(concat_ws(' ',title,company,relevance,url)),lower($2))>0)
 AND ($3='' OR availability=$3) AND ($4='' OR CASE WHEN lower(company_type) ~ '^(product|own.product|direct)' THEN 'direct' WHEN lower(company_type) ~ '^(consult|intermed|staffing|client delivery)' THEN 'agency' ELSE 'unknown' END=$4)
 AND ($5='' OR strpos(lower(coalesce(employment,'')),lower($5))>0)
 AND ($6='' OR coalesce(startup::text,'unknown')=$6) AND (NOT $7 OR stage IS NOT NULL)
 AND ($8 <> 'linkedin' OR url ~* '^https?://([a-z0-9-]+[.])*(linkedin[.]com|lnkd[.]in)([/:?#]|$)' OR EXISTS (SELECT 1 FROM nakama_jobs.evidence se WHERE se.lead_id=cards.id AND se.from_linkedin))
 AND (NOT $9::boolean OR found_on IS NULL) AND ($10::text IS NULL OR found_on >= $10) AND ($11::text IS NULL OR found_on < $11)`;
      const values = [
        owner,
        query.slice(0, 250),
        Object.hasOwn(availabilityLabels, availability) ? availability : "",
        employer,
        contract.slice(0, 100),
        startup,
        board,
        filters.source,
        found === "unknown",
        range?.since ?? null,
        range?.until ?? null,
      ];
      const [counts] = await queryRows(
        db,
        z.object({ total: z.number() }),
        catalogue + " SELECT count(*)::int AS total FROM cards" + where,
        values,
      );
      const total = counts?.total ?? 0;
      const page = Math.max(1, Math.min(filters.page, Math.ceil(total / 40) || 1));
      const rows = await queryRows(
        db,
        leadSchema,
        catalogue +
          " SELECT * FROM cards" +
          where +
          (board
            ? " ORDER BY last_checked DESC NULLS LAST, first_observed DESC NULLS LAST, company,title,id"
            : " ORDER BY found_on DESC NULLS LAST,company,title,id LIMIT 40 OFFSET $12"),
        board ? values : [...values, (page - 1) * 40],
      );
      return { rows, total, page };
    },
    async detail(key: string) {
      const lead = await get(db, key);
      const [observations, events] = await Promise.all([
        queryRows(
          db,
          observation,
          "SELECT observed_date::text,status_observed,source_url,historical,relevance,classification_evidence,evidence_text FROM nakama_jobs.evidence WHERE lead_id=$1 ORDER BY observed_date DESC NULLS LAST,observation_key",
          [key],
        ),
        queryRows(
          db,
          event,
          "SELECT kind,occurred_on::text,detail,practice FROM nakama_jobs.events WHERE owner_id=$1 AND lead_id=$2 ORDER BY occurred_on DESC,recorded_at DESC,id DESC",
          [owner, key],
        ),
      ]);
      return { lead, observations, events };
    },
    async change(raw: JobCommand) {
      const result = commands.safeParse(raw);
      if (!result.success) throw new ProjectError("Check the role details and dates.");
      const c = result.data;
      return db.transaction(async (tx) => {
        if (c.type === "add") {
          const key = "m-" + c.token;
          await tx.query(
            "INSERT INTO nakama_jobs.manual_leads(id,owner_id,company,title,url,first_observed,relevance) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
            [
              key,
              owner,
              c.company,
              c.title,
              c.url || null,
              c.found_on ?? jobDate(),
              c.relevance || null,
            ],
          );
          await get(tx, key);
          return key;
        }
        await track(tx, c.id);
        if (c.type === "event") {
          await tx.query(
            "INSERT INTO nakama_jobs.events(id,owner_id,lead_id,kind,occurred_on,detail,practice) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
            [c.token, owner, c.id, c.kind, c.occurred_on, c.detail, c.practice],
          );
          return c.id;
        }
        const changed = await queryRows(
          tx,
          z.object({ revision: z.number() }),
          "UPDATE nakama_jobs.tracking SET stage=$3,next_action=$4,follow_up=$5,revision=revision+1 WHERE owner_id=$1 AND lead_id=$2 AND revision=$6 RETURNING revision",
          [owner, c.id, c.stage, c.next_action, c.follow_up, c.revision],
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
