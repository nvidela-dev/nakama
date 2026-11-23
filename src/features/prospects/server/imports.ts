import { z } from "zod";
import type { Database, Queryable } from "@/server/database/database";
import { queryRows } from "@/server/database/query";
import { catalogueMembership, catalogueId } from "./access";
import { ProjectError } from "@/shared/contracts/errors";
import type { Actor } from "@/shared/contracts/actor";
import { checksum, decodeSource, type DecodedSource } from "./source-reader";
import { importChunkSize as partSize, maxImportBytes } from "../model";
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const reportSchema = z.object({
  businesses: z.number(),
  sourceRecords: z.number(),
  changed: z.number(),
  stale: z.number(),
  imageReferences: z.number(),
  missingImageFiles: z.number(),
  format: z.string(),
  tables: z.record(z.string(), z.number()),
});
const uploadSchema = z.object({ byte_size: z.number(), report: reportSchema.nullable() });
const invalid = () =>
  new ProjectError("The import could not be verified. Retry with the original file.");

async function publish(
  tx: Queryable,
  digest: string,
  decoded: DecodedSource,
  initialStage: "assess_fit" | "ready",
) {
  // Serialize catalogue imports inside a catalogueId. Profile edits use the same prospect row locks.
  await tx.query("SELECT id FROM prospect_catalogues WHERE id=$1 FOR NO KEY UPDATE", [catalogueId]);
  let changed = 0,
    stale = 0;
  const ordered = [...decoded.records].sort((a, b) => a.id.localeCompare(b.id) || b.rank - a.rank);
  for (let start = 0; start < ordered.length; start += 35) {
    const group = ordered.slice(start, start + 35);
    // A package may have both an SQLite record and a presentation dossier for one business.
    const distinct = new Map<string, (typeof group)[number]>();
    for (const r of group) if (!distinct.has(r.id)) distinct.set(r.id, r);
    const rows = [...distinct.values()].map((r) => ({
      id: r.id,
      name: r.name,
      details: r.details,
      stage: r.stage,
    }));
    await tx.query(
      `INSERT INTO prospects(catalogue_id,id,name,details,status)
      SELECT $1,id,name,details,(CASE stage WHEN 'won' THEN 'deal' WHEN 'lost' THEN 'rejected'
        WHEN 'contacted' THEN 'in_progress' WHEN 'meeting' THEN 'in_progress' WHEN 'proposal' THEN 'in_progress' ELSE $3::text END)::prospect_status
      FROM jsonb_to_recordset($2::jsonb) AS r(id uuid,name text,details text,stage text)
      ON CONFLICT(catalogue_id,id) DO NOTHING`,
      [catalogueId, JSON.stringify(rows), initialStage],
    );
    // Save each complete source document by stable business ID. Lower-fidelity inputs have their own slot.
    const applied = await queryRows(
      tx,
      z.object({ prospect_id: z.uuid(), source_rank: z.number() }),
      `
      INSERT INTO prospect_sources(catalogue_id,prospect_id,source_rank,digest,source_time,payload)
      SELECT $1,id,rank,$2,at,payload FROM jsonb_to_recordset($3::jsonb) AS r(id uuid,rank int,at timestamptz,payload jsonb)
      ON CONFLICT(catalogue_id,prospect_id,source_rank) DO UPDATE SET digest=EXCLUDED.digest,
        source_time=EXCLUDED.source_time,payload=EXCLUDED.payload
      WHERE coalesce(EXCLUDED.source_time,'-infinity')>coalesce(prospect_sources.source_time,'-infinity')
        OR (EXCLUDED.source_time IS NOT DISTINCT FROM prospect_sources.source_time AND
          (SELECT sequence FROM prospect_imports WHERE catalogue_id=$1 AND digest=$2)>
          (SELECT sequence FROM prospect_imports WHERE catalogue_id=$1 AND digest=prospect_sources.digest))
      RETURNING prospect_id,source_rank`,
      [
        catalogueId,
        digest,
        JSON.stringify(group.map(({ id, rank, at, payload }) => ({ id, rank, at, payload }))),
      ],
    );
    changed += applied.length;
    const accepted = new Set(applied.map((s) => s.prospect_id + ":" + s.source_rank));
    const updates = group
      .filter((r) => accepted.has(r.id + ":" + r.rank))
      .map((r) => ({
        id: r.id,
        rank: r.rank,
        at: r.at,
        name: r.name,
        details: r.details,
        stage: r.stage,
      }));
    await tx.query(
      `UPDATE prospects p SET name=CASE WHEN p.edited_name THEN p.name ELSE r.name END,
      details=CASE WHEN p.edited_details THEN p.details ELSE r.details END,revision=p.revision+1,
      status=CASE WHEN r.stage IS NULL OR EXISTS(SELECT 1 FROM prospect_events e WHERE e.catalogue_id=p.catalogue_id AND e.prospect_id=p.id
        AND (e.kind IN ('call','reply','message','stage') OR e.outcome IS NOT NULL)) THEN p.status
        ELSE (CASE r.stage WHEN 'won' THEN 'deal' WHEN 'lost' THEN 'rejected' WHEN 'contacted' THEN 'in_progress'
        WHEN 'meeting' THEN 'in_progress' WHEN 'proposal' THEN 'in_progress' ELSE p.status::text END)::prospect_status END
      FROM jsonb_to_recordset($2::jsonb) AS r(id uuid,rank int,at timestamptz,name text,details text,stage text)
      WHERE p.catalogue_id=$1 AND p.id=r.id AND NOT EXISTS(SELECT 1 FROM prospect_sources s WHERE s.catalogue_id=p.catalogue_id
        AND s.prospect_id=p.id AND ((s.source_rank>1 AND r.rank=1) OR
            (s.source_rank>1 AND r.rank>1 AND (coalesce(s.source_time,'-infinity'),s.source_rank)>(coalesce(r.at,'-infinity'),r.rank))))`,
      [catalogueId, JSON.stringify(updates)],
    );
    stale += group.length - applied.length;
    const refs = group.flatMap((r) => r.hashes.map((hash) => ({ id: r.id, hash })));
    await tx.query(
      `INSERT INTO prospect_image_refs(catalogue_id,prospect_id,sha256) SELECT $1,id,hash
      FROM jsonb_to_recordset($2::jsonb) AS r(id uuid,hash text) ON CONFLICT DO NOTHING`,
      [catalogueId, JSON.stringify(refs)],
    );
  }
  // Batch binary writes by bytes to avoid one database round trip per screenshot.
  let batch: typeof decoded.images = [],
    size = 0;
  async function storeImages() {
    if (!batch.length) return;
    await tx.query(
      `INSERT INTO prospect_image_files(catalogue_id,sha256,media_type,content)
      SELECT $1,r.hash,r.mime,r.bytes FROM unnest($2::text[],$3::text[],$4::bytea[]) AS r(hash,mime,bytes) ON CONFLICT DO NOTHING`,
      [
        catalogueId,
        batch.map((i) => i.hash),
        batch.map((i) => i.type),
        batch.map((i) => Buffer.from(i.bytes.buffer, i.bytes.byteOffset, i.bytes.byteLength)),
      ],
    );
    batch = [];
    size = 0;
  }
  for (const img of decoded.images) {
    batch.push(img);
    size += img.bytes.length;
    if (size >= 1024 * 1024) await storeImages();
  }
  await storeImages();
  const [coverage] = await queryRows(
    tx,
    z.object({ refs: z.number(), missing: z.number() }),
    `
    SELECT count(*)::int AS refs,count(DISTINCT r.sha256) FILTER(WHERE f.sha256 IS NULL)::int AS missing
    FROM prospect_image_refs r LEFT JOIN prospect_image_files f USING(catalogue_id,sha256) WHERE r.catalogue_id=$1`,
    [catalogueId],
  );
  if (coverage!.missing)
    throw new ProjectError(
      "A referenced attachment is missing or unreadable. The catalogue was not imported.",
    );
  const report = {
    businesses: new Set(ordered.map((r) => r.id)).size,
    sourceRecords: ordered.length,
    changed,
    stale,
    imageReferences: coverage!.refs,
    missingImageFiles: coverage!.missing,
    format: decoded.format,
    tables: decoded.tables,
  };
  await tx.query(
    "UPDATE prospect_imports SET metadata=$3::jsonb,report=$4::jsonb,completed_at=now() WHERE catalogue_id=$1 AND digest=$2",
    [catalogueId, digest, JSON.stringify(decoded.metadata), JSON.stringify(report)],
  );
  return report;
}
export function sourceImports(db: Database) {
  return {
    download(person: Actor, digest: string) {
      return db.transaction(async (tx) => {
        await catalogueMembership(tx, person, true);
        const rows = await queryRows(
          tx,
          z.object({ content: z.instanceof(Uint8Array) }),
          `SELECT c.content FROM prospect_import_chunks c JOIN prospect_imports i USING(catalogue_id,digest)
           WHERE c.catalogue_id=$1 AND c.digest=$2 AND i.completed_at IS NOT NULL ORDER BY c.position`,
          [catalogueId, digest],
        );
        if (!rows.length) throw new ProjectError("Import unavailable.");
        return rows.map((row) => row.content);
      });
    },
    start(person: Actor, digest: string, size: number) {
      return db.transaction(async (tx) => {
        await catalogueMembership(tx, person, true);
        if (
          !digestSchema.safeParse(digest).success ||
          !Number.isSafeInteger(size) ||
          size < 1 ||
          size > maxImportBytes
        )
          throw invalid();
        await tx.query(
          `INSERT INTO prospect_imports(catalogue_id,digest,byte_size,imported_by) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [catalogueId, digest, size, person.userId],
        );
        const [u] = await queryRows(
          tx,
          uploadSchema,
          "SELECT byte_size,report FROM prospect_imports WHERE catalogue_id=$1 AND digest=$2",
          [catalogueId, digest],
        );
        if (u?.byte_size !== size) throw invalid();
        return u.report;
      });
    },
    append(person: Actor, digest: string, position: number, chunk: Uint8Array) {
      return db.transaction(async (tx) => {
        await catalogueMembership(tx, person, true);
        const [u] = await queryRows(
          tx,
          uploadSchema,
          "SELECT byte_size,report FROM prospect_imports WHERE catalogue_id=$1 AND digest=$2 FOR SHARE",
          [catalogueId, digest],
        );
        if (
          !u ||
          !Number.isSafeInteger(position) ||
          position < 0 ||
          chunk.length !== Math.min(partSize, u.byte_size - position * partSize) ||
          !chunk.length
        )
          throw invalid();
        if (u.report) return;
        await tx.query(
          `INSERT INTO prospect_import_chunks(catalogue_id,digest,position,content) VALUES($1,$2,$3,$4)
          ON CONFLICT(catalogue_id,digest,position) DO UPDATE SET content=EXCLUDED.content WHERE prospect_import_chunks.content<>EXCLUDED.content`,
          [catalogueId, digest, position, Buffer.from(chunk)],
        );
      });
    },
    finish(person: Actor, digest: string) {
      return db.transaction(async (tx) => {
        const scope = await catalogueMembership(tx, person, true);
        const [u] = await queryRows(
          tx,
          uploadSchema,
          "SELECT byte_size,report FROM prospect_imports WHERE catalogue_id=$1 AND digest=$2 FOR UPDATE",
          [catalogueId, digest],
        );
        if (!u) throw invalid();
        if (u.report) return u.report;
        const chunks = await queryRows(
          tx,
          z.object({ content: z.instanceof(Uint8Array) }),
          "SELECT content FROM prospect_import_chunks WHERE catalogue_id=$1 AND digest=$2 ORDER BY position",
          [catalogueId, digest],
        );
        const bytes = Buffer.concat(chunks.map((c) => c.content));
        if (bytes.length !== u.byte_size || checksum(bytes) !== digest) throw invalid();
        return publish(
          tx,
          digest,
          await decodeSource(bytes),
          scope.availableStages.includes("assess_fit") ? "assess_fit" : "ready",
        );
      });
    },
  };
}
