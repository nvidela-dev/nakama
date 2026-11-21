import { z } from "zod";
import { queryRows } from "@/server/database/query";
import { ProspectStatusValues } from "@/shared/contracts/database.generated";
import type { CatalogueRead } from "./access";
const card = z.object({
  id: z.uuid(),
  name: z.string(),
  status: z.enum(ProspectStatusValues),
  revision: z.number(),
  assignee_name: z.string().nullable(),
  city: z.string(),
  industry: z.string(),
  called: z.boolean(),
  latest_outcome: z.string().nullable(),
  open_todos: z.number(),
  image: z.string().nullable(),
  mine: z.boolean(),
  unassigned: z.boolean(),
  on_board: z.boolean(),
});
const facets = z.object({
  regions: z.array(z.string()),
  cities: z.array(z.string()),
  industries: z.array(z.string()),
  services: z.array(z.string()),
  owners: z.array(z.object({ id: z.string(), name: z.string() })),
});
const result = z.object({ cards: z.array(card), counts: z.record(z.string(), z.number()), facets });
export async function browse(
  scope: CatalogueRead,
  all: boolean,
  filters: URLSearchParams,
  page: number,
  visibility: string,
) {
  const board = filters.get("view") === "board",
    limit = board ? 16 : 40;
  const [rows] = await queryRows(
    scope.tx,
    result,
    `
  WITH allowed AS MATERIALIZED (
    SELECT p.id,p.name,p.status,p.revision,p.assignee_id,(p.assignee_id IS NOT DISTINCT FROM $2) mine,(p.assignee_id IS NULL) unassigned,p.on_board,m.display_name AS assignee_name,
      coalesce(f.region,'') region,coalesce(f.city,'') city,coalesce(f.industry,'') industry,coalesce(f.services,'{}'::text[]) services,coalesce(f.identity_state,'unknown') identity_state,
      position(lower($4) in lower(concat_ws(' ',p.name,p.details,f.search_text,CASE WHEN $4<>'' THEN p.research::text END)))>0 AS search_hit,
      EXISTS(SELECT 1 FROM prospect_events e WHERE e.catalogue_id=p.catalogue_id AND e.prospect_id=p.id AND e.kind='call') called,
      coalesce(s.cover_sha256,(SELECT r.sha256 FROM prospect_image_refs r WHERE r.catalogue_id=p.catalogue_id AND r.prospect_id=p.id ORDER BY r.sha256 LIMIT 1)) image
    FROM prospects p LEFT JOIN prospect_facets f ON f.catalogue_id=p.catalogue_id AND f.prospect_id=p.id
    LEFT JOIN prospect_sources s ON s.catalogue_id=p.catalogue_id AND s.prospect_id=p.id AND s.source_rank=2
    LEFT JOIN prospect_memberships m ON m.catalogue_id=p.catalogue_id AND m.user_id=p.assignee_id
    WHERE ${visibility} AND (NOT $16::boolean OR (p.assignee_id=$2 AND p.on_board))
  ), filtered AS MATERIALIZED (
    SELECT * FROM allowed WHERE search_hit AND ($5='' OR region=$5) AND ($6='' OR city=$6)
    AND ($7='' OR industry=$7) AND ($8='' OR status::text=$8) AND ($16 OR $9='' OR coalesce(assignee_id,'unassigned')=$9)
    AND ($10='' OR called=($10='yes')) AND ($11='' OR (image IS NOT NULL)=($11='yes')) AND ($12='' OR identity_state=$12)
    AND ($13='' OR (cardinality(services)>0)=($13='tagged'))
    AND (cardinality($14::text[])=0 OR CASE WHEN $15='all' THEN services @> $14::text[] ELSE services && $14::text[] END)
  ), ranked AS (
    SELECT *,row_number() OVER(PARTITION BY CASE WHEN $16 THEN status END ORDER BY lower(name),id) AS rn FROM filtered
  ), shown AS (
    SELECT r.id,r.name,r.status,r.revision,r.assignee_name,r.city,r.industry,r.called,r.image,r.mine,r.unassigned,r.on_board,
      (SELECT e.note FROM prospect_events e WHERE e.catalogue_id=$1 AND e.prospect_id=r.id
       AND (e.outcome IS NOT NULL OR e.kind IN ('call','message','reply')) ORDER BY e.id DESC LIMIT 1) latest_outcome,
      (SELECT count(*)::int FROM prospect_todos t WHERE t.catalogue_id=$1 AND t.prospect_id=r.id AND NOT done) open_todos
    FROM ranked r WHERE rn>$17 AND rn<=$18 ORDER BY lower(name),id
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY lower(s.name),s.id) FROM shown s),'[]') AS cards,
    coalesce((SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*)::int n FROM filtered GROUP BY status)c),'{}') AS counts,
    jsonb_build_object('regions',ARRAY(SELECT DISTINCT region FROM allowed WHERE region<>'' ORDER BY region),
    'cities',ARRAY(SELECT DISTINCT city FROM allowed WHERE city<>'' ORDER BY city),
    'industries',ARRAY(SELECT DISTINCT industry FROM allowed WHERE industry<>'' ORDER BY industry),
    'services',ARRAY(SELECT DISTINCT label FROM allowed CROSS JOIN LATERAL unnest(services) label ORDER BY label),
    'owners',coalesce((SELECT jsonb_agg(jsonb_build_object('id',assignee_id,'name',assignee_name) ORDER BY assignee_name)
     FROM (SELECT DISTINCT assignee_id,assignee_name FROM allowed WHERE assignee_id IS NOT NULL) m),'[]')) AS facets
  `,
    [
      scope.catalogueId,
      scope.actor.userId,
      all,
      ...[
        "q",
        "region",
        "city",
        "industry",
        "stage",
        "assignee",
        "called",
        "images",
        "identity",
        "classification",
      ].map((k) => filters.get(k) ?? ""),
      filters.getAll("service"),
      filters.get("match") ?? "any",
      board,
      (page - 1) * limit,
      page * limit,
    ],
  );
  if (!rows) throw new Error("Missing catalogue result");
  return rows;
}
