import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import { z } from "zod";
import { loadWorkspace } from "../src/app/projects/[projectId]/workspace";
import { projectService } from "../src/features/projects/server/projects";
import type { Database, Queryable } from "../src/server/database/database";

async function exercise(db: Database, migrate: (sql: string) => Promise<unknown>, native: boolean) {
  for (const file of (await readdir("migrations")).filter((name) => name.endsWith(".sql")).sort())
    await migrate(await readFile(join("migrations", file), "utf8"));
  const owner = { userId: "read-fixture", verifiedEmails: [] };
  const project = await projectService(db).create(owner, {
    name: "Read fixture",
    description: "Synthetic only",
  });
  await db.query(
    `INSERT INTO project_comments(id,project_id,stage_id,author_id,author_name,content,created_at)
    SELECT gen_random_uuid(),$1,CASE WHEN i%40=0 THEN 'tasks' ELSE 'artifacts' END,'read-fixture','Fixture','Synthetic',now()-i*interval '1 second' FROM generate_series(1,8000) i`,
    [project],
  );
  await db.query(
    `INSERT INTO project_activity(id,project_id,kind,actor_id,actor_name,created_at)
    SELECT gen_random_uuid(),$1,'project_created','read-fixture','Fixture',now()-i*interval '1 second' FROM generate_series(1,8000) i`,
    [project],
  );
  await db.query("ANALYZE project_comments");
  await db.query("ANALYZE project_activity");
  const plans = new Map<string, { sql: string; values?: unknown[] | undefined }>();
  let checkouts = 0;
  const measured: Database = {
    query: () => {
      throw new Error("Unscoped workspace checkout");
    },
    transaction: (read) =>
      db.transaction((tx) => {
        checkouts++;
        return read({
          query: (sql, values) => {
            if (sql.includes(" AS is_read,")) plans.set("Section comments", { sql, values });
            if (sql.includes("WITH events AS")) plans.set("Activity", { sql, values });
            return tx.query(sql, values);
          },
        });
      }),
  };
  const options = { target: { stageId: "tasks" }, focusedWork: false, activityView: true };
  const start = performance.now();
  const count = native ? 12 : 1;
  const views = await Promise.all(
    Array.from({ length: count }, () => loadWorkspace(measured, owner, project, options)),
  );
  for (const view of views) {
    assert.equal(view.comments.items.length, 25);
    assert.equal(view.activity.items.length, 25);
    assert.ok(view.comments.next && view.activity.next);
  }
  assert.equal(checkouts, count);
  console.log(
    `${native ? "PostgreSQL (pool maximum 3)" : "PGlite"}: ${count} workspaces, ${checkouts} checkouts, ${Math.round(performance.now() - start)} ms`,
  );
  assert.equal(plans.size, 2);
  for (const [name, { sql, values }] of plans) {
    const result = await db.query("EXPLAIN (ANALYZE,BUFFERS) " + sql, values);
    const lines = z
      .array(z.object({ "QUERY PLAN": z.string() }))
      .parse(result.rows)
      .map((row) => row["QUERY PLAN"]);
    console.log(
      name +
        "\n" +
        lines
          .filter((line) =>
            /\bLimit\b|Index.*Scan|Rows Removed by Filter|Execution Time/.test(line),
          )
          .join("\n"),
    );
  }
}

if (process.argv.includes("--pglite")) {
  const pg = new PGlite();
  try {
    await exercise(
      { query: (q, v) => pg.query(q, v), transaction: (fn) => pg.transaction((tx) => fn(tx)) },
      (sql) => pg.exec(sql),
      false,
    );
  } finally {
    await pg.close();
  }
} else {
  const directory = await mkdtemp(join(tmpdir(), "nakama-reads-"));
  const server = new EmbeddedPostgres({
    databaseDir: join(directory, "data"),
    port: 55437,
    user: "postgres",
    password: "fixture",
    persistent: false,
    postgresFlags: ["-h", "", "-k", directory],
    onLog: () => {},
    onError: console.error,
  });
  const pool = new Pool({
    host: directory,
    port: 55437,
    database: "postgres",
    user: "postgres",
    password: "fixture",
    max: 3,
    connectionTimeoutMillis: 10000,
  });
  // pg-pool can finish draining before its clients have received their socket close events.
  const closedConnections: Promise<void>[] = [];
  pool.on("connect", (client) => {
    closedConnections.push(new Promise<void>((resolve) => client.once("end", resolve)));
  });
  try {
    await server.initialise();
    await server.start();
    const db: Database = {
      query: (sql, values) => pool.query(sql, values),
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const queryable: Queryable = { query: (sql, values) => client.query(sql, values) };
          const result = await fn(queryable);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
    await exercise(db, (sql) => pool.query(sql), true);
  } finally {
    await pool.end();
    await Promise.all(closedConnections);
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
}
