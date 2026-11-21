import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { strFromU8, unzipSync } from "fflate";
import { z } from "zod";
import type { Database as SqliteDatabase } from "sql.js";
import { ProjectError } from "@/shared/contracts/errors";

type Fields = Record<string, unknown>;
type Source = {
  id: string;
  name: string;
  details: string;
  rank: number;
  at: string | null;
  payload: Fields;
  stage: string | null;
  hashes: string[];
};
type ImageFile = { hash: string; type: string; bytes: Uint8Array };
export type DecodedSource = {
  records: Source[];
  metadata: Fields;
  images: ImageFile[];
  tables: Record<string, number>;
  format: string;
};
const fail = () => new ProjectError("This file is not a complete supported catalogue export.");
const object = (v: unknown): Fields => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw fail();
  return v as Fields;
};
const string = (v: unknown) => (typeof v === "string" ? v : "");
function timestamp(v: unknown) {
  const t = string(v);
  return /^\d{4}-\d\d-\d\dT/.test(t) && Number.isFinite(Date.parse(t))
    ? new Date(t).toISOString()
    : null;
}
const identifier = (v: unknown) => z.uuid().parse(v);
export const checksum = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
function details(values: unknown[]) {
  return [...new Set(values.map(string).filter(Boolean))].join("\n");
}
function summary(row: Fields) {
  const id = identifier(row.id),
    name = string(row.name).trim();
  if (!name || name.length > 300) throw fail();
  return { id, name };
}
const sha = z.string().regex(/^[0-9a-f]{64}$/);
function imageType(bytes: Uint8Array) {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP")
    return "image/webp";
  return null;
}
function tableRows(db: SqliteDatabase, sql: string): Fields[] {
  const stmt = db.prepare(sql);
  const rows: Fields[] = [];
  // The driver supports exact 64-bit reads; its published types omit the options parameter.
  const exact: { getAsObject(params: undefined, options: { useBigInt: true }): Fields } = stmt;
  try {
    while (stmt.step()) {
      const row = exact.getAsObject(undefined, { useBigInt: true });
      rows.push(
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            k,
            v instanceof Uint8Array
              ? { encoding: "base64", data: Buffer.from(v).toString("base64") }
              : typeof v === "bigint"
                ? Number.isSafeInteger(Number(v))
                  ? Number(v)
                  : v.toString()
                : v,
          ]),
        ),
      );
    }
  } finally {
    stmt.free();
  }
  return rows;
}
async function readNative(bytes: Uint8Array, sourceTime: string | null) {
  const init = (await import("sql.js/dist/sql-asm.js")).default;
  const SQL = await init();
  const db = new SQL.Database(bytes);
  try {
    db.run("PRAGMA trusted_schema=OFF; PRAGMA query_only=ON");
    const tables = tableRows(db, "PRAGMA table_list").filter(
      (r) => r.schema === "main" && r.type !== "view" && !string(r.name).startsWith("sqlite_"),
    );
    if (
      tables.some(
        (t) =>
          t.type !== "table" ||
          ["__proto__", "prototype", "constructor"].includes(string(t.name)) ||
          !/^\w+$/.test(string(t.name)),
      )
    )
      throw fail();
    const check = db.exec("PRAGMA integrity_check(1)"),
      fk = db.exec("PRAGMA foreign_key_check");
    if (check[0]?.values[0]?.[0] !== "ok" || fk.length) throw fail();
    const all = new Map<string, Fields[]>();
    for (const t of tables) {
      const name = string(t.name);
      all.set(name, tableRows(db, `SELECT * FROM "${name}"`));
    }
    const businesses = all.get("businesses");
    if (!businesses?.length) throw fail();
    const records = new Map<string, { row: Fields; related: Record<string, Fields[]> }>();
    for (const row of businesses) {
      const { id } = summary(row);
      if (records.has(id)) throw fail();
      records.set(id, { row, related: Object.create(null) });
    }
    const globals: Fields = Object.create(null);
    const assessmentBusiness = new Map(
      (all.get("research_assessments") ?? []).map((r) => [r.id, r.business_id]),
    );
    for (const [name, rows] of all) {
      if (name === "businesses") continue;
      const unscoped: Fields[] = [];
      for (const row of rows) {
        const id =
          row.business_id ??
          (name === "assessment_ingestion" ? assessmentBusiness.get(row.assessment_id) : undefined);
        if (id === undefined || id === null) {
          unscoped.push(row);
          continue;
        }
        const target = records.get(String(id));
        if (!target) throw fail();
        (target.related[name] ??= []).push(row);
      }
      if (unscoped.length || !rows.length) globals[name] = unscoped;
    }
    const contactById = new Map((all.get("contacts") ?? []).map((r) => [r.id, r]));
    const tagById = new Map((all.get("service_tags") ?? []).map((r) => [r.id, r]));
    const output: Source[] = [];
    for (const [id, { row, related }] of records) {
      const contacts = related.business_contacts ?? [];
      related.contacts = [...new Set(contacts.map((r) => r.contact_id))]
        .map((k) => contactById.get(k))
        .filter((v): v is Fields => !!v);
      related.service_tags = [
        ...new Set((related.service_tag_assignments ?? []).map((r) => r.tag_id)),
      ]
        .map((k) => tagById.get(k))
        .filter((v): v is Fields => !!v);
      const clocks = [row, ...Object.values(related).flat()].flatMap((r) =>
        Object.entries(r).flatMap(([key, val]) =>
          key.endsWith("_at") && key !== "due_at" ? (timestamp(val) ?? []) : [],
        ),
      );
      output.push({
        id,
        name: summary(row).name,
        details: details([
          row.city,
          row.category,
          row.website,
          ...contacts.map((c) => c.display_value),
        ]),
        rank: 3,
        at: sourceTime ?? clocks.sort().at(-1) ?? null,
        stage: string(related.pipeline?.[0]?.stage) || null,
        hashes: (related.screenshot_artifacts ?? []).map((x) => sha.parse(x.sha256)),
        payload: { business: row, tables: related },
      });
    }
    return {
      records: output,
      globals,
      tables: Object.fromEntries([...all].map(([name, rows]) => [name, rows.length])),
    };
  } finally {
    db.close();
  }
}
function json(bytes: Uint8Array) {
  return object(JSON.parse(strFromU8(bytes)));
}
export async function decodeSource(bytes: Uint8Array): Promise<DecodedSource> {
  try {
    let size = 0;
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
    const files = isZip
      ? unzipSync(bytes, {
          filter: (e) => {
            // Source code, executable content and older backups stay inert in the original archive.
            if (!(
              /^(database\/prospects\.sqlite3\.gz|prospects\.sqlite3|assets\/manifest\.json|(?:site\/)?dist\/data\/[^/]+\.json)$/i.test(
                e.name,
              ) || /\.(jpe?g|webp|png)$/i.test(e.name)
            ))
              return false;
            size += e.originalSize;
            if (size > 512 * 1024 * 1024) throw fail();
            return true;
          },
        })
      : {};
    const sqlFile = files["database/prospects.sqlite3.gz"];
    const rawSqlite = Buffer.from(bytes.subarray(0, 16)).toString("ascii") === "SQLite format 3\0";
    const native = rawSqlite
      ? bytes
      : sqlFile
        ? gunzipSync(sqlFile, { maxOutputLength: 160 * 1024 * 1024 })
        : files["prospects.sqlite3"];
    const siteRoot = files["dist/data/catalogue.json"] ? "dist/" : "site/dist/";
    const indexBytes = isZip
      ? files[siteRoot + "data/catalogue.json"]
      : rawSqlite
        ? undefined
        : bytes;
    const index = indexBytes ? json(indexBytes) : null;
    if (!index && !native) throw fail();
    const meta = index?.meta ? object(index.meta) : {};
    const at = timestamp(meta.snapshot_at);
    const parsed = native ? await readNative(native, at) : null;
    const records = parsed?.records ?? [];
    const metaRest: Fields = { ...index };
    delete metaRest.businesses;
    const images: ImageFile[] = [];
    const filePaths = new Map<string, string>();
    for (const [name, blob] of Object.entries(files)) {
      if (!/\.(jpe?g|webp|png)$/i.test(name)) continue;
      const type = imageType(blob);
      if (!type) continue;
      const hash = checksum(blob);
      images.push({ hash, type, bytes: blob });
      filePaths.set(name, hash);
    }
    const assetMap = new Map<string, string[]>();
    if (files["assets/manifest.json"]) {
      const manifest = z
        .array(z.object({ business_id: z.uuid(), sha256: sha }))
        .parse(JSON.parse(strFromU8(files["assets/manifest.json"])));
      for (const a of manifest) {
        const arr = assetMap.get(a.business_id) ?? [];
        arr.push(a.sha256);
        assetMap.set(a.business_id, arr);
      }
    }
    const sharedDocuments: Fields = {};
    for (const [name, bytes] of Object.entries(files)) {
      if (!name.startsWith(siteRoot + "data/") || !name.endsWith(".json")) continue;
      const key = name.slice((siteRoot + "data/").length, -5);
      if (key !== "catalogue" && !z.uuid().safeParse(key).success)
        sharedDocuments[key] = JSON.parse(strFromU8(bytes));
    }
    if (index) {
      const seen = new Set<string>();
      if (!Array.isArray(index.businesses) || !index.businesses.length) throw fail();
      if (meta.business_count !== undefined && meta.business_count !== index.businesses.length)
        throw fail();
      let screenshotCount = 0;
      for (const v of index.businesses) {
        const row = object(v),
          { id, name } = summary(row);
        if (seen.has(id)) throw fail();
        seen.add(id);
        const raw = files[siteRoot + `data/${id}.json`],
          doc = raw ? json(raw) : null;
        if (doc && doc.id !== id) throw fail();
        if (!doc && !native)
          throw new ProjectError(
            "A full catalogue import requires the dossiers and their attachments. Choose the complete archive.",
          );
        const hashes = new Set(assetMap.get(id) ?? []);
        const contacts = Array.isArray(doc?.contacts)
          ? doc.contacts.map((c) => object(c).display_value)
          : [];
        const screenshots = Array.isArray(doc?.screenshots) ? doc.screenshots : [];
        screenshotCount += screenshots.length;
        const attachments: Record<string, string> = Object.create(null);
        const paths = [...screenshots.map((entry) => string(object(entry).src))];
        if (row.thumbnail) paths.push(string(row.thumbnail));
        for (const ref of new Set(paths)) {
          const hash =
            filePaths.get(siteRoot + ref.replace(/^(?:\.\/|\/)/, "")) ?? filePaths.get(ref);
          if (!hash)
            throw new ProjectError(
              "A referenced attachment is missing or unreadable. The catalogue was not imported.",
            );
          hashes.add(hash);
          attachments[ref] = hash;
        }
        records.push({
          id,
          name,
          rank: doc ? 2 : 1,
          at,
          details: details([row.city, row.category, doc?.website, ...contacts]),
          payload: doc ? { index: row, dossier: doc, attachments } : { index: row },
          stage: null,
          hashes: [...hashes],
        });
      }
      if (typeof meta.screenshot_count === "number" && meta.screenshot_count !== screenshotCount)
        throw fail();
      for (const id of assetMap.keys()) if (!seen.has(id)) throw fail();
    }
    return {
      records,
      tables: parsed?.tables ?? {},
      metadata: { catalogue: metaRest, sharedDocuments, sharedTables: parsed?.globals ?? {} },
      images,
      format: native ? "database" : isZip ? "presentation" : "index",
    };
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw fail();
  }
}
