import { required } from "../src/server/database/query";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { projectService, type Actor } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";
import { taskService, TaskConflictError } from "../src/features/tasks/server/tasks";
import { taskTree } from "../src/features/tasks/model";
import { parseLockInFile } from "../src/features/tasks/lockin-format";
const sql = new PGlite();
const db: Database = {
  query: (q, v) => sql.query(q, v),
  transaction: (work) => sql.transaction((tx) => work(tx)),
};
const projects = projectService(db),
  tasks = taskService(db);
const owner: Actor = { userId: "owner", verifiedEmails: [], displayName: "Owner" },
  member: Actor = { userId: "member", verifiedEmails: [], displayName: "Member" },
  outsider: Actor = { userId: "outsider", verifiedEmails: [] };
before(async () => {
  for (const file of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort())
    await sql.exec(await readFile(`migrations/${file}`, "utf8"));
});
after(() => sql.close());
async function project() {
  const id = await projects.create(owner, {
    name: "Task test",
    description: "Synthetic task project",
  });
  await db.query(
    "INSERT INTO project_memberships(project_id,user_id,role,display_name) VALUES($1,$2,'member',$3)",
    [id, member.userId, member.displayName],
  );
  return id;
}
const source = {
  id: "project_local",
  name: "Local tasks",
  created_at: "2026-10-20T12:00:00Z",
  updated_at: "2026-10-21T12:00:00Z",
  tasks: [
    {
      id: "task_parent",
      title: "Plan",
      status: "in_progress",
      collapsed: true,
      created_at: "2026-10-20T12:00:00Z",
      updated_at: "2026-10-21T12:00:00Z",
      subtasks: [
        {
          id: "task_child",
          title: "Research",
          status: "ready",
          collapsed: false,
          created_at: "2026-10-20T12:00:00Z",
          updated_at: "2026-10-21T12:00:00Z",
          subtasks: null,
        },
      ],
    },
  ],
};
test("nested tasks preserve display numbering, shared statuses, edits, and project boundaries", async () => {
  const id = await project(),
    other = await project();
  let list = await tasks.list(owner, id);
  assert.equal(list.revision, 0);
  list = await tasks.change(owner, id, list.revision, {
    kind: "add",
    parentId: null,
    title: "First",
  });
  const root = required(list.tasks[0]).id;
  list = await tasks.change(member, id, list.revision, {
    kind: "add",
    parentId: root,
    title: "Child",
  });
  const child = required(list.tasks[1]).id;
  list = await tasks.change(owner, id, list.revision, {
    kind: "add",
    parentId: child,
    title: "Grandchild",
  });
  assert.deepEqual(
    taskTree(list.tasks).flatMap((t) => [
      t.number,
      required(t.children[0]).number,
      required(required(t.children[0]).children[0]).number,
    ]),
    ["1", "1.1", "1.1.1"],
  );
  list = await tasks.change(member, id, list.revision, {
    kind: "edit",
    id: child,
    title: "Edited child",
  });
  list = await tasks.change(owner, id, list.revision, {
    kind: "status",
    id: child,
    status: "in_progress",
  });
  assert.equal(required(list.tasks[1]).status, "in_progress");
  assert.equal(required(list.tasks[0]).status, "ready");
  await assert.rejects(
    tasks.change(owner, id, list.revision, { kind: "status", id: root, status: "done" }),
  );
  list = await tasks.change(owner, id, list.revision, {
    kind: "status",
    id: root,
    status: "done",
    scope: "task",
    confirmed: true,
  });
  assert.equal(required(list.tasks[0]).status, "done");
  assert.equal(required(list.tasks[1]).status, "in_progress");
  list = await tasks.change(owner, id, list.revision, {
    kind: "status",
    id: root,
    status: "done",
    scope: "subtree",
    confirmed: true,
  });
  assert.ok(list.tasks.every((t) => t.status === "done"));
  list = await tasks.change(member, id, list.revision, {
    kind: "collapse",
    ids: [root],
    collapsed: true,
  });
  assert.equal(required(list.tasks[0]).collapsed, true);
  list = await tasks.change(member, id, list.revision, {
    kind: "add",
    parentId: root,
    title: "Another child",
  });
  assert.equal(required(list.tasks[0]).collapsed, false);
  await assert.rejects(tasks.list(outsider, id));
  await assert.rejects(tasks.export(outsider, id));
  await assert.rejects(
    tasks.change(outsider, id, list.revision, { kind: "delete", id: root, confirmed: true }),
  );
  await assert.rejects(
    tasks.change(owner, other, 0, { kind: "add", parentId: root, title: "Foreign parent" }),
  );
  await assert.rejects(
    tasks.change(owner, other, 0, { kind: "edit", id: root, title: "Foreign edit" }),
  );
  await db.query("DELETE FROM project_memberships WHERE project_id=$1 AND user_id=$2", [
    id,
    member.userId,
  ]);
  await assert.rejects(
    tasks.change(member, id, list.revision, {
      kind: "add",
      parentId: null,
      title: "Removed member",
    }),
  );
});
test("stale deletes and cascades reject new descendants; deletion renumbers remaining tasks", async () => {
  const id = await project();
  let list = await tasks.change(owner, id, 0, { kind: "add", parentId: null, title: "Parent" });
  const root = required(list.tasks[0]).id;
  const stale = list.revision;
  list = await tasks.change(member, id, list.revision, {
    kind: "add",
    parentId: root,
    title: "New child",
  });
  await assert.rejects(
    tasks.change(owner, id, stale, { kind: "delete", id: root, confirmed: true }),
    TaskConflictError,
  );
  await assert.rejects(
    tasks.change(owner, id, stale, {
      kind: "status",
      id: root,
      status: "done",
      scope: "subtree",
      confirmed: true,
    }),
    TaskConflictError,
  );
  await assert.rejects(tasks.change(owner, id, list.revision, { kind: "delete", id: root }));
  list = await tasks.change(owner, id, list.revision, {
    kind: "add",
    parentId: null,
    title: "Other root",
  });
  list = await tasks.change(owner, id, list.revision, {
    kind: "delete",
    id: root,
    confirmed: true,
  });
  assert.equal(list.tasks.length, 1);
  assert.equal(required(taskTree(list.tasks)[0]).number, "1");
});
test("Lock-In import/export preserves trees, statuses, collapse, timestamps, and rejects duplicates or unauthorized access", async () => {
  const id = await project();
  const input = parseLockInFile(
    JSON.stringify({ version: 1, active_project: source.id, projects: [source] }),
  );
  let list = await tasks.import(owner, id, 0, input.projects[0]);
  assert.equal(list.tasks.length, 2);
  assert.notEqual(required(list.tasks[0]).id, required(source.tasks[0]).id);
  const exported = await tasks.export(member, id);
  assert.equal(exported.version, 1);
  assert.equal(exported.active_project, id);
  assert.equal(required(exported.projects[0]).name, "Task test");
  const root = required(exported.projects[0]).tasks[0];
  assert.equal(required(root).title, "Plan");
  assert.equal(required(root).status, "in_progress");
  assert.equal(required(root).collapsed, true);
  assert.equal(required(root).created_at, "2026-10-20T12:00:00.000Z");
  assert.equal(required(required(root).subtasks[0]).title, "Research");
  assert.deepEqual(required(required(root).subtasks[0]).subtasks, []);
  assert.doesNotThrow(() => parseLockInFile(JSON.stringify(exported)));
  await assert.rejects(
    tasks.import(owner, id, list.revision, input.projects[0]),
    /already been imported/,
  );
  await assert.rejects(tasks.import(outsider, id, list.revision, input.projects[0]));
  const other = await project();
  await tasks.import(owner, other, 0, input.projects[0]);
  assert.equal((await tasks.list(owner, other)).tasks.length, 2);
  assert.throws(() => parseLockInFile(JSON.stringify({ ...exported, version: 2 })));
  assert.throws(() =>
    parseLockInFile(
      JSON.stringify({
        version: 1,
        active_project: source.id,
        projects: [{ ...source, tasks: [source.tasks[0], source.tasks[0]] }],
      }),
    ),
  );
  const bad = structuredClone(source);
  required(bad.tasks[0]).status = "unknown";
  await assert.rejects(tasks.import(owner, id, list.revision, bad));
  assert.equal((await tasks.list(owner, id)).revision, list.revision);
});
test("task writes and imports roll back with their events, and whole-project deletion removes tasks", async () => {
  const id = await project();
  const faulty: Database = {
    ...db,
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          query: async (q: string, v?: unknown[]) => {
            if (q.startsWith("INSERT INTO project_activity")) throw Error("Event failure");
            return tx.query(q, v);
          },
        }),
      ),
  };
  await assert.rejects(
    taskService(faulty).change(owner, id, 0, { kind: "add", parentId: null, title: "Rolled back" }),
  );
  await assert.rejects(taskService(faulty).import(owner, id, 0, source));
  assert.equal((await tasks.list(owner, id)).tasks.length, 0);
  const list = await tasks.import(owner, id, 0, source);
  assert.equal(list.tasks.length, 2);
  await projects.deleteProject(owner, id, "Task test");
  for (const table of ["project_tasks", "project_task_lists", "project_task_imports"]) {
    assert.equal(
      (await db.query(`SELECT * FROM ${table} WHERE project_id=$1`, [id])).rows.length,
      0,
    );
  }
});
