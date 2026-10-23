import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { projectService } from "../src/lib/projects";
import { artifactService } from "../src/lib/artifacts";
import type { Database } from "../src/lib/database";
import { queryRows, required } from "../src/lib/query";
import { projectTaskSchema } from "../src/lib/row-schemas";
const actor = { userId: "schema-owner", verifiedEmails: [] };
const files = async () =>
  (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort();
const migrate = async (sql: PGlite, through = "999") => {
  for (const name of await files())
    if (name <= through)
      await sql.exec(await readFile(`migrations/${name}`, "utf8"));
};
const database = (sql: PGlite): Database => ({
  query: (q, v) => sql.query(q, v),
  transaction: (work) => sql.transaction((tx) => work(tx)),
});
test("generated table types and enum values exactly match a fresh database built from migrations", () => {
  execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/database-types.ts", "--check"],
    { stdio: "pipe" },
  );
});
test("populated migration preserves artifact tasks, ordering, file bytes, revisions and unrelated project data", async () => {
  const sql = new PGlite();
  try {
    await migrate(sql, "009_project_lineage.sql");
    const db = database(sql),
      project = await projectService(db).create(actor, {
        name: "Migration fixture",
        description: "Synthetic only",
      });
    const artifact = randomUUID(),
      file = randomUUID(),
      tasks = [
        { id: randomUUID(), title: "First", status: "in_progress" },
        { id: randomUUID(), title: "Second", status: "done" },
      ];
    await sql.query(
      "INSERT INTO project_artifacts(id,project_id,name,kind,status,tasks,revision,created_by,updated_by) VALUES($1,$2,'Images','image','ready',$3::jsonb,7,$4,$4)",
      [artifact, project, JSON.stringify(tasks), actor.userId],
    );
    const bytes = Buffer.from("Synthetic stored file bytes");
    await sql.query(
      "INSERT INTO artifact_files(id,project_id,artifact_id,name,media_type,data,size,created_by) VALUES($1,$2,$3,'fixture.png','image/png',$4,$5,$6)",
      [file, project, artifact, bytes, bytes.length, actor.userId],
    );
    const before = (
      await sql.query(
        "SELECT id,name,description,created_at FROM projects ORDER BY id",
      )
    ).rows;
    for (const name of await files())
      if (name > "009_project_lineage.sql") {
        const migration = await readFile(`migrations/${name}`, "utf8");
        await sql.transaction((tx) => tx.exec(migration));
      }
    assert.deepEqual(
      (
        await sql.query(
          "SELECT id,name,description,created_at FROM projects ORDER BY id",
        )
      ).rows,
      before,
    );
    const detail = await artifactService(db).get(actor, project, artifact);
    assert.deepEqual(detail.tasks, tasks);
    assert.equal(detail.revision, 7);
    assert.equal(detail.status, "ready");
    assert.deepEqual(
      Buffer.from(
        (await artifactService(db).file(actor, project, artifact, file)).data,
      ),
      bytes,
    );
    assert.equal(required(detail.files[0]).size, bytes.length);
    const reordered = await artifactService(db).tasks(
      actor,
      project,
      artifact,
      7,
      [required(tasks[1]), required(tasks[0])],
    );
    assert.deepEqual(reordered.tasks, [tasks[1], tasks[0]]);
    assert.equal(reordered.revision, 8);
    assert.equal(
      (
        await sql.query(
          "SELECT 1 FROM information_schema.columns WHERE table_name='project_artifacts' AND column_name='tasks'",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      sql.query("UPDATE artifact_files SET size=1 WHERE id=$1", [file]),
    );
    await projectService(db).deleteProject(actor, project, "Migration fixture");
    assert.equal(
      (await sql.query("SELECT 1 FROM artifact_tasks")).rows.length,
      0,
    );
    assert.equal(
      (await sql.query("SELECT 1 FROM artifact_files")).rows.length,
      0,
    );
  } finally {
    await sql.close();
  }
});
test("invalid legacy JSON fails migration atomically without discarding the original tasks", async () => {
  const sql = new PGlite();
  try {
    await migrate(sql, "009_project_lineage.sql");
    const project = await projectService(database(sql)).create(actor, {
        name: "Invalid migration fixture",
        description: "Synthetic only",
      }),
      artifact = randomUUID();
    const tasks = [
      { id: "not-a-uuid", title: "Original preserved", status: "ready" },
    ];
    await sql.query(
      "INSERT INTO project_artifacts(id,project_id,name,kind,tasks,created_by,updated_by) VALUES($1,$2,'Draft','image',$3::jsonb,$4,$4)",
      [artifact, project, JSON.stringify(tasks), actor.userId],
    );
    const migration = await readFile(
      "migrations/010_relational_artifact_tasks.sql",
      "utf8",
    );
    await assert.rejects(sql.transaction((tx) => tx.exec(migration)));
    assert.deepEqual(
      required(
        (
          await sql.query<{ tasks: unknown }>(
            "SELECT tasks FROM project_artifacts WHERE id=$1",
            [artifact],
          )
        ).rows[0],
      ).tasks,
      tasks,
    );
    assert.equal(
      required(
        (
          await sql.query<{ table_name: string | null }>(
            "SELECT to_regclass('artifact_tasks')::text AS table_name",
          )
        ).rows[0],
      ).table_name,
      null,
    );
  } finally {
    await sql.close();
  }
});
test("database guards reject invalid statuses, cross-project references, cycles and missing ready outputs", async () => {
  const sql = new PGlite();
  try {
    await migrate(sql);
    const db = database(sql),
      projects = projectService(db),
      artifacts = artifactService(db);
    const a = await projects.create(actor, {
        name: "Integrity A",
        description: "Synthetic only",
      }),
      b = await projects.create(actor, {
        name: "Integrity B",
        description: "Synthetic only",
      }),
      c = await projects.create(actor, {
        name: "Integrity C",
        description: "Synthetic only",
      });
    await assert.rejects(
      sql.query(
        "UPDATE project_memberships SET role='admin' WHERE project_id=$1",
        [a],
      ),
    );
    await sql.query(
      "INSERT INTO project_links(source_id,child_id,created_by) VALUES($1,$2,$4),($2,$3,$4)",
      [a, b, c, actor.userId],
    );
    await assert.rejects(
      sql.query(
        "INSERT INTO project_links(source_id,child_id,created_by) VALUES($1,$2,$3)",
        [c, a, actor.userId],
      ),
    );
    const parent = randomUUID(),
      child = randomUUID();
    await sql.query(
      "INSERT INTO project_tasks(project_id,id,parent_id,title,created_by,updated_by) VALUES($1,$2,NULL,'Parent',$4,$4),($1,$3,$2,'Child',$4,$4)",
      [a, parent, child, actor.userId],
    );
    await assert.rejects(
      sql.query(
        "UPDATE project_tasks SET parent_id=$1 WHERE project_id=$2 AND id=$3",
        [child, a, parent],
      ),
    );
    await assert.rejects(
      sql.query("UPDATE project_tasks SET parent_id=id WHERE project_id=$1", [
        a,
      ]),
    );
    const comment = randomUUID();
    await sql.query(
      "INSERT INTO project_comments(id,project_id,author_id,author_name,content) VALUES($1,$2,$3,'Owner','Synthetic')",
      [comment, a, actor.userId],
    );
    await assert.rejects(
      sql.query(
        "INSERT INTO project_activity(id,project_id,kind,actor_id,actor_name,comment_id) VALUES($1,$2,'comment_created',$3,'Owner',$4)",
        [randomUUID(), b, actor.userId, comment],
      ),
    );
    const artifact = await artifacts.create(actor, a, {
      name: "Draft",
      kind: "image",
    });
    await assert.rejects(
      sql.query("UPDATE project_artifacts SET status='ready' WHERE id=$1", [
        artifact,
      ]),
    );
    assert.equal(
      (await artifacts.get(actor, a, artifact)).status,
      "in_progress",
    );
    await assert.rejects(
      sql.query("UPDATE project_artifacts SET kind='markdown' WHERE id=$1", [
        artifact,
      ]),
    );
    const file = randomUUID();
    await assert.rejects(
      sql.query(
        "INSERT INTO artifact_files(id,project_id,artifact_id,name,media_type,data,created_by) VALUES($1,$2,$3,'bad.md','text/markdown',$4,$5)",
        [file, a, artifact, Buffer.from("Bad image kind"), actor.userId],
      ),
    );
    await sql.transaction(async (tx) => {
      await tx.query(
        "UPDATE project_artifacts SET status='ready' WHERE id=$1",
        [artifact],
      );
      await tx.query(
        "INSERT INTO artifact_files(id,project_id,artifact_id,name,media_type,data,created_by) VALUES($1,$2,$3,'fixture.png','image/png',$4,$5)",
        [file, a, artifact, Buffer.from("Synthetic bytes"), actor.userId],
      );
    });
    await assert.rejects(
      sql.query("DELETE FROM artifact_files WHERE id=$1", [file]),
    );
    assert.equal((await artifacts.get(actor, a, artifact)).files.length, 1);
    await sql.transaction(async (tx) => {
      await tx.query("DELETE FROM artifact_files WHERE id=$1", [file]);
      await tx.query(
        "UPDATE project_artifacts SET status='in_progress' WHERE id=$1",
        [artifact],
      );
    });
    assert.equal((await artifacts.get(actor, a, artifact)).files.length, 0);
    await assert.rejects(
      sql.query(
        "INSERT INTO artifact_tasks(project_id,artifact_id,id,position,title,status) VALUES($1,$2,$3,0,'Wrong project','ready')",
        [b, artifact, randomUUID()],
      ),
    );
    await assert.rejects(
      sql.query(
        "INSERT INTO artifact_tasks(project_id,artifact_id,id,position,title,status) VALUES($1,$2,$3,100,'Too many','ready')",
        [a, artifact, randomUUID()],
      ),
    );
  } finally {
    await sql.close();
  }
});
test("query decoders fail closed without including row contents in errors", async () => {
  const tx = {
    query: async <T extends object>() => ({
      rows: [
        {
          id: randomUUID(),
          parent_id: null,
          title: "PRIVATE SYNTHETIC TITLE",
          status: "forged",
          collapsed: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ] as unknown as T[],
    }),
  };
  await assert.rejects(
    queryRows(tx, projectTaskSchema, "Synthetic query"),
    (error: Error) => {
      assert.equal(
        error.message,
        "Database result does not match its declared schema.",
      );
      assert.ok(!error.message.includes("PRIVATE"));
      return true;
    },
  );
});

test("artifact library returns task counts without titles and bulk saves have bounded round trips", async () => {
  const sql = new PGlite();
  try {
    await migrate(sql);
    const db = database(sql),
      project = await projectService(db).create(actor, {
        name: "Payload fixture",
        description: "Synthetic only",
      });
    const artifact = await artifactService(db).create(actor, project, {
      name: "Task summary",
      kind: "image",
    });
    let calls = 0;
    const measured: Database = {
      query: db.query,
      transaction: (work) =>
        db.transaction((tx) =>
          work({
            query: (q, v) => {
              calls++;
              return tx.query(q, v);
            },
          }),
        ),
    };
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: randomUUID(),
      title: `SYNTHETIC PRIVATE TASK ${i} ` + "x".repeat(250),
      status: i % 2 ? "ready" : "done",
    }));
    const saved = await artifactService(measured).tasks(
      actor,
      project,
      artifact,
      1,
      tasks,
    );
    assert.equal(saved.tasks.length, 100);
    assert.ok(calls <= 20, `100 tasks required ${calls} queries`);
    const card = required((await artifactService(db).list(actor, project))[0]);
    assert.equal(card.task_count, 100);
    assert.equal(card.done_task_count, 50);
    assert.ok(!("tasks" in card));
    assert.ok(!JSON.stringify(card).includes("SYNTHETIC PRIVATE TASK"));
    const reordered = await artifactService(db).tasks(
      actor,
      project,
      artifact,
      saved.revision,
      [...tasks].reverse(),
    );
    assert.deepEqual(
      reordered.tasks.map((task) => task.id),
      tasks.map((task) => task.id).reverse(),
    );
  } finally {
    await sql.close();
  }
});
