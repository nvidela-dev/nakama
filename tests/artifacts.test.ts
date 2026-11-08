import { z } from "zod";
import { queryRows, required } from "../src/server/database/query";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { artifactService, ArtifactConflictError } from "../src/features/artifacts/server/artifacts";
import { projectService } from "../src/features/projects/server/projects";
import { guidanceService } from "../src/features/guidance/server/guidance";
import type { Database } from "../src/server/database/database";
const sql = new PGlite(),
  db: Database = {
    query: (q, v) => sql.query(q, v),
    transaction: (work) => sql.transaction((tx) => work(tx)),
  };
const artifacts = artifactService(db),
  projects = projectService(db),
  guidance = guidanceService(db);
const owner = {
    userId: "artifact-owner",
    displayName: "Owner",
    verifiedEmails: ["owner@example.com"],
  },
  member = {
    userId: "artifact-member",
    displayName: "Member",
    verifiedEmails: ["member@example.com"],
  },
  outsider = { userId: "outsider", verifiedEmails: [] };
before(async () => {
  for (const file of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort())
    await sql.exec(await readFile("migrations/" + file, "utf8"));
});
after(async () => {
  await sql.close();
});
async function fixture() {
  const projectId = await projects.create(owner, {
    name: "Artifact fixture",
    description: "Synthetic artifact tests",
  });
  await guidance.select(owner, projectId, "creative");
  const invite = await projects.invite(owner, projectId, member.verifiedEmails[0]);
  await projects.accept(member, invite.token);
  return projectId;
}
test("artifacts and private file bytes honor membership, project identity, removal and global library access", async () => {
  const projectId = await fixture(),
    other = await projects.create(outsider, {
      name: "Unrelated artifact project",
      description: "Not visible to owner",
    });
  const id = await artifacts.create(member, projectId, {
    name: "Research notes",
    kind: "markdown",
    stageId: "imagine",
  });
  await artifacts.create(outsider, other, { name: "Secret", kind: "software" });
  let detail = await artifacts.upload(member, projectId, id, 1, {
    name: "notes.md",
    data: Buffer.from("# Private notes"),
  });
  assert.ok((await artifacts.list(owner)).some((a) => a.id === id));
  assert.ok(!(await artifacts.list(owner)).some((a) => a.project_id === other));
  assert.equal((await artifacts.list(outsider, other)).length, 1);
  await assert.rejects(artifacts.get(owner, other, id));
  await assert.rejects(artifacts.list(outsider, projectId));
  await assert.rejects(artifacts.file(owner, other, id, required(detail.files[0]).id));
  await assert.rejects(artifacts.file(outsider, projectId, id, required(detail.files[0]).id));
  const file = await artifacts.file(owner, projectId, id, required(detail.files[0]).id);
  assert.equal(Buffer.from(file.data).toString(), "# Private notes");
  await projects.remove(owner, projectId, member.userId);
  assert.ok(!(await artifacts.list(member)).some((a) => a.id === id));
  await assert.rejects(artifacts.get(member, projectId, id));
  await assert.rejects(artifacts.file(member, projectId, id, required(detail.files[0]).id));
  await assert.rejects(
    artifacts.save(member, projectId, id, detail.revision, { name: "No", status: "ready" }),
  );
});
test("in-progress artifacts may be placeholders; readiness requires typed outputs and valid stage/GitHub links", async () => {
  const projectId = await fixture();
  for (const kind of ["image", "markdown", "software"] as const) {
    await assert.rejects(
      artifacts.create(owner, projectId, { name: "Empty ready", kind, status: "ready" }),
    );
    const id = await artifacts.create(owner, projectId, { name: "In progress", kind });
    assert.equal((await artifacts.get(owner, projectId, id)).status, "in_progress");
    await assert.rejects(
      artifacts.save(owner, projectId, id, 1, { name: "Ready", status: "ready" }),
    );
  }
  await assert.rejects(
    artifacts.create(owner, projectId, {
      name: "Wrong stage",
      kind: "image",
      stageId: "validation",
    }),
  );
  await assert.rejects(
    artifacts.create(owner, projectId, {
      name: "Bad link",
      kind: "software",
      githubUrl: "https://github.com.evil.example/owner/repo",
    }),
  );
  await assert.rejects(
    artifacts.create(owner, projectId, {
      name: "Bad link",
      kind: "software",
      githubUrl: "javascript:alert(1)",
    }),
  );
  const id = await artifacts.create(owner, projectId, {
    name: "Version 1",
    kind: "software",
    githubUrl: "https://github.com/example/repo/releases/tag/v1",
    status: "ready",
  });
  assert.equal((await artifacts.get(owner, projectId, id)).status, "ready");
  await assert.rejects(
    artifacts.upload(owner, projectId, id, 1, { name: "cover.png", data: Buffer.from("invalid") }),
  );
});
test("image payloads are sniffed, bounded, previewed without library bytes, and require progress before removing the last ready output", async () => {
  const projectId = await fixture(),
    id = await artifacts.create(owner, projectId, { name: "Design", kind: "image" });
  await assert.rejects(
    artifacts.upload(owner, projectId, id, 1, {
      name: "fake.png",
      data: Buffer.from("<svg><script>bad()</script></svg>"),
    }),
  );
  await assert.rejects(
    artifacts.upload(owner, projectId, id, 1, {
      name: "large.png",
      data: new Uint8Array(2 * 1024 * 1024 + 1),
    }),
  );
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#dcf6a3" } })
    .png()
    .toBuffer();
  let detail = await artifacts.upload(owner, projectId, id, 1, {
    name: "misleading.txt",
    data: png,
  });
  assert.equal(required(detail.files[0]).media_type, "image/png");
  assert.equal(required(detail.files[0]).name, "misleading.png");
  assert.equal((await artifacts.list(owner, projectId)).find((a) => a.id === id)?.file_count, 1);
  assert.ok(!JSON.stringify(await artifacts.list(owner, projectId)).includes('"data"'));
  detail = await artifacts.save(owner, projectId, id, detail.revision, {
    name: "Design",
    status: "ready",
  });
  await assert.rejects(
    artifacts.removeFile(owner, projectId, id, detail.revision, required(detail.files[0]).id),
  );
  detail = await artifacts.save(owner, projectId, id, detail.revision, {
    name: "Design",
    status: "in_progress",
  });
  detail = await artifacts.removeFile(
    owner,
    projectId,
    id,
    detail.revision,
    required(detail.files[0]).id,
  );
  assert.equal(detail.files.length, 0);
});
test("Markdown replacement is atomic, UTF-8 validated, revisions prevent lost edits, and artifact tasks remain independent", async () => {
  const projectId = await fixture(),
    id = await artifacts.create(owner, projectId, { name: "Plan", kind: "markdown" });
  await assert.rejects(
    artifacts.upload(owner, projectId, id, 1, {
      name: "plan.md",
      data: new Uint8Array([255, 254, 0]),
    }),
  );
  await assert.rejects(
    artifacts.upload(owner, projectId, id, 1, { name: "plan.txt", data: Buffer.from("# A plan") }),
  );
  let first = await artifacts.upload(owner, projectId, id, 1, {
    name: "plan.md",
    data: Buffer.from("# Version one"),
  });
  const oldId = required(first.files[0]).id;
  await assert.rejects(
    artifacts.upload(member, projectId, id, 1, { name: "other.md", data: Buffer.from("# Stale") }),
    ArtifactConflictError,
  );
  const next = await artifacts.upload(member, projectId, id, first.revision, {
    name: "plan.md",
    data: Buffer.from("# Version two\n\n<script>unsafe()</script>"),
  });
  assert.equal(next.files.length, 1);
  assert.match(next.markdown!, /Version two/);
  await assert.rejects(artifacts.file(owner, projectId, id, oldId));
  const task = { id: randomUUID(), title: "Write the introduction", status: "done" };
  const saved = await artifacts.tasks(owner, projectId, id, next.revision, [task]);
  assert.equal(required(saved.tasks[0]).status, "done");
  assert.equal(saved.status, "in_progress");
  assert.equal((await artifacts.get(owner, projectId, id)).tasks.length, 1);
  await assert.rejects(
    artifacts.tasks(member, projectId, id, next.revision, []),
    ArtifactConflictError,
  );
  await assert.rejects(artifacts.tasks(owner, projectId, id, saved.revision, [task, task]));
  const ready = await artifacts.save(owner, projectId, id, saved.revision, {
    name: "Plan",
    status: "ready",
    stageId: "imagine",
  });
  assert.equal(ready.stage_id, "imagine");
});
test("whole-artifact and project deletion remove their files; failures leave data intact and activity has no private bodies", async () => {
  const projectId = await fixture(),
    id = await artifacts.create(owner, projectId, { name: "Delete me", kind: "markdown" });
  const detail = await artifacts.upload(owner, projectId, id, 1, {
    name: "notes.md",
    data: Buffer.from("Sensitive content fixture"),
  });
  await assert.rejects(artifacts.remove(owner, projectId, id, detail.revision, "Wrong name"));
  assert.equal((await artifacts.get(owner, projectId, id)).files.length, 1);
  const activity = await queryRows(
    db,
    z.object({ subject_name: z.string().nullable() }),
    "SELECT subject_name FROM project_activity WHERE project_id=$1",
    [projectId],
  );
  assert.ok(!JSON.stringify(activity).includes("Sensitive content fixture"));
  await artifacts.remove(owner, projectId, id, detail.revision, "Delete me");
  await assert.rejects(artifacts.get(owner, projectId, id));
  const another = await artifacts.create(owner, projectId, {
    name: "Cascade",
    kind: "markdown",
    stageId: "imagine",
  });
  await artifacts.upload(owner, projectId, another, 1, {
    name: "notes.md",
    data: Buffer.from("Cascade fixture"),
  });
  await projects.deleteProject(owner, projectId, "Artifact fixture");
  assert.equal(
    required(
      (
        await queryRows(
          db,
          z.object({ count: z.number().int() }),
          "SELECT count(*)::int AS count FROM artifact_files WHERE project_id=$1",
          [projectId],
        )
      )[0],
    ).count,
    0,
  );
});
test("a failed activity write rolls back Markdown replacement and preserves the original file and revision", async () => {
  const projectId = await fixture(),
    id = await artifacts.create(owner, projectId, { name: "Atomic plan", kind: "markdown" });
  const initial = await artifacts.upload(owner, projectId, id, 1, {
    name: "original.md",
    data: Buffer.from("# Keep this original"),
  });
  const broken: Database = {
    query: db.query,
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          query: async (q, v) => {
            if (q.includes("INSERT INTO project_activity"))
              throw new Error("Synthetic event failure");
            return tx.query(q, v);
          },
        }),
      ),
  };
  await assert.rejects(
    artifactService(broken).upload(owner, projectId, id, initial.revision, {
      name: "replacement.md",
      data: Buffer.from("# Must roll back"),
    }),
  );
  const preserved = await artifacts.get(owner, projectId, id);
  assert.equal(preserved.revision, initial.revision);
  assert.equal(required(preserved.files[0]).id, required(initial.files[0]).id);
  assert.equal(preserved.markdown, "# Keep this original");
});

test("shirt artwork, collections and project counts follow membership, revisions and the current experiment plan", async () => {
  const { projectActivityCounts } =
    await import("../src/features/projects/server/project-progress");
  const shop = await projects.create(owner, { name: "Sample store", description: "Print fixture" });
  await guidance.select(owner, shop, "shirt-eshop");
  const create = { name: "Crew tee", kind: "shirt", collection: "Autumn" };
  await assert.rejects(artifacts.create(owner, await fixture(), create));
  const id = await artifacts.create(owner, shop, create);
  let item = await artifacts.get(owner, shop, id);
  assert.equal(item.shirt?.collection, "Autumn");
  const image = await sharp({ create: { width: 32, height: 32, channels: 4, background: "red" } })
    .png()
    .toBuffer();
  item = await artifacts.upload(owner, shop, id, item.revision, { name: "motif.png", data: image });
  const paintedId = await artifacts.create(owner, shop, create);
  const blank = await artifacts.get(owner, shop, paintedId);
  const stroke = {
    zone: "chest",
    tool: "paint",
    color: "#223344",
    order: 1,
    size: 0.05,
    paths: [
      [
        [0, 0.5],
        [1, 0.5],
      ],
    ],
  };
  const printed = { collection: "Painted", layout: { ...blank.shirt!.layout, ink: [stroke] } };
  await assert.rejects(
    artifacts.shirt(owner, shop, paintedId, blank.revision, {
      ...printed,
      layout: { ...printed.layout, ink: [{ ...stroke, paths: [[[2, 0.5]]] }] },
    }),
  );
  const paint = await artifacts.shirt(owner, shop, paintedId, blank.revision, printed);
  const ready = await artifacts.save(owner, shop, paintedId, paint.revision, {
    name: "Paint-only",
    status: "ready",
  });
  assert.equal(ready.files.length, 0);
  await assert.rejects(
    artifacts.shirt(owner, shop, paintedId, ready.revision, {
      ...printed,
      layout: { ...printed.layout, ink: [] },
    }),
  );
  await assert.rejects(
    db.query(
      "UPDATE shirt_designs SET layout=layout-'ink' WHERE project_id=$1 AND artifact_id=$2",
      [shop, paintedId],
    ),
  );
  await artifacts.remove(owner, shop, paintedId, ready.revision, "Paint-only");
  const fileId = item.files[0]!.id;
  const layer = {
    id: randomUUID(),
    fileId,
    zone: "left_sleeve",
    x: 0.5,
    y: 0.6,
    width: 0.7,
    rotation: 20,
  };
  const design = { collection: "Winter", layout: { ...item.shirt!.layout, layers: [layer] } };
  await assert.rejects(artifacts.shirt(outsider, shop, id, item.revision, design));
  await assert.rejects(
    artifacts.shirt(owner, shop, id, item.revision, {
      ...design,
      layout: { ...design.layout, layers: [{ ...layer, fileId: randomUUID() }] },
    }),
  );
  const invalid = { tool: "erase", color: "#ffffff", size: 0.1, points: [[8, 0.5]] };
  await assert.rejects(
    artifacts.shirt(owner, shop, id, item.revision, {
      ...design,
      layout: { ...design.layout, layers: [{ ...layer, strokes: [invalid] }] },
    }),
  );
  await assert.rejects(
    artifacts.shirt(owner, shop, id, item.revision, {
      ...design,
      poster: "data:image/webp;base64,YWJj",
    }),
  );
  const poster =
    "data:image/webp;base64," +
    (await sharp(image).resize(224, 224).webp().toBuffer()).toString("base64");
  const saved = await artifacts.shirt(owner, shop, id, item.revision, { ...design, poster });
  const card = (await artifacts.list(owner, shop)).find((c) => c.id === id);
  assert.ok(card);
  assert.ok(card.shirt_poster?.startsWith("data:image/webp;base64,"));
  assert.equal(card.shirt_cover, null);
  assert.ok(!(await artifacts.list(outsider)).some((c) => c.id === id));
  assert.deepEqual(saved.shirt, design);
  assert.equal((await artifacts.list(owner, shop))[0]?.collection, "Winter");
  await assert.rejects(
    artifacts.shirt(owner, shop, id, item.revision, design),
    ArtifactConflictError,
  );
  await assert.rejects(artifacts.removeFile(owner, shop, id, saved.revision, fileId));
  await artifacts.create(owner, shop, { ...create, collection: "WINTER" });
  await db.query(
    "INSERT INTO project_tasks(id,project_id,title,status,created_by,updated_by) VALUES(gen_random_uuid(),$1,'A','done','s','s'),(gen_random_uuid(),$1,'B','in_progress','s','s')",
    [shop],
  );
  await db.query(
    "INSERT INTO project_milestones(project_id,flow_id,template_id,title,status,position,created_by,updated_by) VALUES($1,'shirt-eshop','garment_run','Sample','completed',0,'s','s'),($1,'shirt-eshop','garment_run','Print','active',1,'s','s')",
    [shop],
  );
  for (const state of ["running", "completed", "planned"]) {
    const experiment = randomUUID(),
      plan = randomUUID();
    await db.query("INSERT INTO experiments(id,project_id,created_by) VALUES($1,$2,'s')", [
      experiment,
      shop,
    ]);
    await db.query(
      "INSERT INTO experiment_plans(id,project_id,experiment_id,version,definition,author_id) VALUES($1,$2,$3,1,'{}','s')",
      [plan, shop, experiment],
    );
    // A past run is historical evidence, even after a replacement plan starts.
    await db.query(
      "INSERT INTO experiment_runs(project_id,experiment_id,plan_id,context,status,executor,started_by,started_at,ended_at) VALUES($1,$2,$3,'{}','completed','s','s',now()-interval '1 day',now()-interval '1 hour')",
      [shop, experiment, plan],
    );
    if (state === "planned")
      await db.query(
        "INSERT INTO experiment_plans(project_id,experiment_id,version,definition,author_id) VALUES($1,$2,2,'{}','s')",
        [shop, experiment],
      );
    if (state !== "planned")
      await db.query(
        "INSERT INTO experiment_runs(project_id,experiment_id,plan_id,context,status,executor,started_by,ended_at) VALUES($1,$2,$3,'{}',$4,'s','s',CASE WHEN $4::lab_run_status='completed' THEN now() END)",
        [shop, experiment, plan, state],
      );
  }
  assert.deepEqual((await projectActivityCounts(db, owner)).get(shop), {
    id: shop,
    milestones: 2,
    covered: 1,
    tasks: 2,
    open_tasks: 1,
    experiments: 3,
    active: 1,
    completed: 1,
    shirts: 2,
    collections: 1,
  });
  assert.equal((await projectActivityCounts(db, outsider)).has(shop), false);
});
