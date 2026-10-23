import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Pool } from "pg";

if (!process.env.DATABASE_URL_UNPOOLED)
  throw new Error("Set DATABASE_URL_UNPOOLED for the intended isolated database.");
if (new URL(process.env.DATABASE_URL_UNPOOLED).hostname.includes("-pooler"))
  throw new Error("Use a direct, non-pooled connection for migrations.");
class MigrationIntegrityError extends Error {}
let applying: string | undefined;
const applied: string[] = [];
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  max: 1,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(734921)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const files = (await readdir("migrations")).filter((name) => name.endsWith(".sql")).sort();
  const history = (
    await client.query<{ name: string }>("SELECT name FROM schema_migrations ORDER BY name")
  ).rows;
  if (history.some((row, index) => row.name !== files[index]))
    throw new MigrationIntegrityError(
      "Migration history is not a prefix of this checkout. Use the matching code and migration files.",
    );
  for (const name of files) {
    const sql = await readFile(`migrations/${name}`, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = (
      await client.query("SELECT checksum FROM schema_migrations WHERE name = $1", [name])
    ).rows[0];
    if (previous) {
      if (previous.checksum !== checksum)
        throw new MigrationIntegrityError(`Applied migration changed: ${name}`);
      continue;
    }
    applying = name;
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
      name,
      checksum,
    ]);
    applied.push(name);
  }
  await client.query("COMMIT");
  for (const name of applied) console.log(`Applied ${name}`);
} catch (error) {
  await client.query("ROLLBACK");
  if (error instanceof MigrationIntegrityError) throw error;
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[0-9A-Z]{5}$/.test(error.code)
      ? error.code
      : "unknown";
  // Postgres DETAIL can contain complete private rows. Keep it out of terminal/CI logs.
  throw new Error(
    `Migration ${applying ?? "setup"} failed (SQLSTATE ${code}); transaction rolled back.`,
  );
} finally {
  client.release();
  await pool.end();
}
