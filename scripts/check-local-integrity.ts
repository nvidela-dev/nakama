import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { projectService } from "../src/lib/projects";
import { collaborationService } from "../src/lib/collaboration";
import { guidanceService } from "../src/lib/guidance";
import type { Database } from "../src/lib/database";
// Deliberately fixed to db:local; never read an application's hosted connection string.
const pool = new Pool({
  connectionString:
    "postgresql://postgres:nakama-local@127.0.0.1:54331/postgres",
  max: 4,
});
const db: Database = {
  query: (q, v) => pool.query(q, v),
  transaction: async (work) => {
    const tx = await pool.connect();
    try {
      await tx.query("BEGIN");
      const result = await work(tx);
      await tx.query("COMMIT");
      return result;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    } finally {
      tx.release();
    }
  },
};
const actor = { userId: "local-integrity-" + randomUUID(), verifiedEmails: [] },
  projects = projectService(db),
  ids: string[] = [];
async function oneSucceeds(operations: Promise<unknown>[]) {
  const results = await Promise.allSettled(operations);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  for (const result of results)
    if (result.status === "rejected") {
      const reason: unknown = result.reason;
      assert.ok(reason && typeof reason === "object" && "code" in reason);
      assert.equal(reason.code, "23514");
    }
}
try {
  const a = await projects.create(actor, {
      name: "Local integrity A",
      description: "Synthetic only",
    }),
    b = await projects.create(actor, {
      name: "Local integrity B",
      description: "Synthetic only",
    });
  ids.push(a, b);
  await oneSucceeds([
    pool.query(
      "INSERT INTO project_links(source_id,child_id,created_by) VALUES($1,$2,$3)",
      [a, b, actor.userId],
    ),
    pool.query(
      "INSERT INTO project_links(source_id,child_id,created_by) VALUES($1,$2,$3)",
      [b, a, actor.userId],
    ),
  ]);
  const first = randomUUID(),
    second = randomUUID();
  await pool.query(
    "INSERT INTO project_tasks(project_id,id,title,created_by,updated_by) VALUES($1,$2,'First',$4,$4),($1,$3,'Second',$4,$4)",
    [a, first, second, actor.userId],
  );
  await oneSucceeds([
    pool.query(
      "UPDATE project_tasks SET parent_id=$1 WHERE project_id=$2 AND id=$3",
      [first, a, second],
    ),
    pool.query(
      "UPDATE project_tasks SET parent_id=$1 WHERE project_id=$2 AND id=$3",
      [second, a, first],
    ),
  ]);
  const artifact = randomUUID();
  await pool.query(
    "INSERT INTO project_artifacts(id,project_id,name,kind,created_by,updated_by) VALUES($1,$2,'Images','image',$3,$3)",
    [artifact, a, actor.userId],
  );
  const insertFile = () =>
    pool.query(
      "INSERT INTO artifact_files(id,project_id,artifact_id,name,media_type,data,created_by) VALUES($1,$2,$3,'synthetic.png','image/png',$4,$5)",
      [randomUUID(), a, artifact, Buffer.from("Synthetic bytes"), actor.userId],
    );
  for (let i = 0; i < 5; i++) await insertFile();
  await oneSucceeds([insertFile(), insertFile()]);
  await guidanceService(db).select(actor, a, "creative");
  const collaboration = collaborationService(db);
  const commentId = await collaboration.post(
    actor,
    a,
    { stageId: "imagine", nodeId: "inspiration" },
    "Synthetic scoped discussion",
  );
  const comments = await collaboration.comments(actor, a, {
    stageId: "imagine",
    nodeId: "inspiration",
  });
  assert.ok(
    comments.items.some(
      (comment) =>
        comment.id === commentId && comment.created_at instanceof Date,
    ),
  );
  const activity = await collaboration.activity(actor, a);
  assert.ok(activity.items.some((event) => event.kind === "answer_captured"));
  assert.ok(activity.items.some((event) => event.kind === "comment_created"));
  const migrationDatabase =
    "nakama_migration_" + randomUUID().replaceAll("-", "");
  const migrationFolder = await mkdtemp(
    join(tmpdir(), "nakama-migration-check-"),
  );
  await pool.query(`CREATE DATABASE "${migrationDatabase}"`);
  const migrationPool = new Pool({
    connectionString: `postgresql://postgres:nakama-local@127.0.0.1:54331/${migrationDatabase}`,
    max: 1,
  });
  try {
    await mkdir(join(migrationFolder, "migrations"));
    await writeFile(
      join(migrationFolder, "migrations", "001_failure.sql"),
      "CREATE TABLE migration_rollback(value text CHECK(value='allowed')); INSERT INTO migration_rollback VALUES('SYNTHETIC_PRIVATE_ROW');",
    );
    const run = spawnSync(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        fileURLToPath(new URL("./migrate.ts", import.meta.url)),
      ],
      {
        cwd: migrationFolder,
        env: {
          ...process.env,
          DATABASE_URL_UNPOOLED: `postgresql://postgres:nakama-local@127.0.0.1:54331/${migrationDatabase}`,
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(run.status, 0);
    assert.ok(run.stderr.includes("SQLSTATE 23514"));
    assert.ok(!run.stderr.includes("SYNTHETIC_PRIVATE_ROW"));
    assert.ok(!run.stdout.includes("Applied"));
    const row = (
      await migrationPool.query<{ table_name: string | null }>(
        "SELECT to_regclass('migration_rollback')::text AS table_name",
      )
    ).rows[0];
    assert.equal(row?.table_name, null);
  } finally {
    await migrationPool.end();
    await pool.query(`DROP DATABASE "${migrationDatabase}"`);
    await rm(migrationFolder, { recursive: true, force: true });
  }
  console.log(
    "Real Postgres concurrency, decoded activity, and safe migration rollback checks passed.",
  );
} finally {
  for (const id of ids) {
    const project = await projects.get(actor, id);
    await projects.deleteProject(actor, id, project.name);
  }
  await pool.end();
}
