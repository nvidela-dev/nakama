import { required } from "../src/server/database/query";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { projectService, type Actor } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";
import { taskService, TaskConflictError } from "../src/features/tasks/server/tasks";
import { taskTree } from "../src/features/tasks/model";
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
test("task writes roll back with their events, and whole-project deletion removes tasks", async () => {
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
  assert.equal((await tasks.list(owner, id)).tasks.length, 0);
  const list = await tasks.change(owner, id, 0, {
    kind: "add",
    parentId: null,
    title: "Preserved",
  });
  assert.equal(list.tasks.length, 1);
  await projects.deleteProject(owner, id, "Task test");
  for (const table of ["project_tasks", "project_task_lists", "project_task_imports"]) {
    assert.equal(
      (await db.query(`SELECT * FROM ${table} WHERE project_id=$1`, [id])).rows.length,
      0,
    );
  }
});

test("milestone workflows preserve task trees, ordering, revisions and project boundaries", async () => {
  const id = await project(),
    other = await project();
  await db.query(
    "INSERT INTO project_flows(project_id,flow_id,template_version,selected_by) VALUES($1,'platform',1,$2)",
    [id, owner.userId],
  );
  let list = await tasks.list(owner, id);
  await assert.rejects(
    tasks.change(owner, id, list.revision, {
      kind: "milestone-add",
      title: "Wrong flow",
      description: "",
      templateId: "practice_cycle",
    }),
  );
  list = await tasks.change(owner, id, list.revision, {
    kind: "milestone-add",
    title: "Sprint",
    description: "Build it",
    templateId: "build_sprint",
  });
  const milestone = list.milestones[0]!;
  await assert.rejects(
    tasks.change(outsider, id, list.revision, {
      kind: "milestone-delete",
      id: milestone.id,
      confirmed: true,
    }),
  );
  await assert.rejects(
    tasks.change(owner, other, 0, {
      kind: "milestone-edit",
      id: milestone.id,
      title: "Foreign",
      description: "",
      status: "active",
    }),
  );
  await assert.rejects(
    tasks.change(owner, id, 0, { kind: "milestone-order", id: milestone.id, beforeId: null }),
    TaskConflictError,
  );
  list = await tasks.change(owner, id, list.revision, {
    kind: "add",
    title: "Parent",
    parentId: null,
    milestoneId: milestone.id,
    columnId: "backlog",
  });
  const parent = list.tasks[0]!;
  list = await tasks.change(owner, id, list.revision, {
    kind: "add",
    title: "Child",
    parentId: parent.id,
    milestoneId: milestone.id,
    columnId: "backlog",
  });
  const child = list.tasks[1]!;
  list = await tasks.change(owner, id, list.revision, {
    kind: "move",
    id: child.id,
    milestoneId: milestone.id,
    columnId: "backlog",
    beforeId: parent.id,
  });
  assert.equal(list.tasks.find((t) => t.id === child.id)!.board_position, 0);
  assert.equal(list.tasks.find((t) => t.id === parent.id)!.board_position, 1);
  list = await tasks.change(owner, id, list.revision, {
    kind: "move",
    id: child.id,
    milestoneId: milestone.id,
    columnId: "review",
    beforeId: null,
  });
  assert.equal(list.tasks[1]!.status, "in_progress");
  assert.equal(list.tasks[1]!.parent_id, parent.id);
  await assert.rejects(
    tasks.change(owner, id, list.revision, {
      kind: "move",
      id: child.id,
      milestoneId: milestone.id,
      columnId: "wrong",
      beforeId: null,
    }),
  );
  await assert.rejects(
    tasks.change(owner, id, list.revision, {
      kind: "move",
      id: parent.id,
      milestoneId: milestone.id,
      columnId: "done",
      beforeId: null,
    }),
  );
  await assert.rejects(
    tasks.change(owner, id, list.revision, {
      kind: "milestone-edit",
      id: milestone.id,
      title: milestone.title,
      description: "",
      status: "completed",
    }),
  );
  list = await tasks.change(owner, id, list.revision, {
    kind: "status",
    id: parent.id,
    status: "done",
    scope: "subtree",
    confirmed: true,
  });
  assert.ok(list.tasks.every((t) => t.column_id === "done"));
  list = await tasks.change(owner, id, list.revision, {
    kind: "milestone-delete",
    id: milestone.id,
    confirmed: true,
  });
  assert.equal(list.tasks.length, 2);
  assert.ok(list.tasks.every((t) => t.milestone_id === null && t.status === "done"));
  assert.equal(list.tasks[1]!.parent_id, parent.id);
  await projects.deleteProject(owner, id, "Task test");
});

test("task artifacts are atomic, project-scoped, detachable and retained when a card is deleted", async () => {
  const id = await project(),
    other = await project();
  let list = await tasks.change(owner, id, 0, {
    kind: "add",
    title: "Evidence card",
    parentId: null,
  });
  const card = list.tasks[0]!;
  list = await tasks.change(owner, id, list.revision, {
    kind: "create-artifact",
    id: card.id,
    name: "Evidence",
    artifactKind: "markdown",
  });
  const artifactId = list.attachments[0]!.artifact_id;
  await assert.rejects(
    tasks.change(outsider, id, list.revision, {
      kind: "attach",
      id: card.id,
      artifactId,
      remove: true,
    }),
  );
  let foreign = await tasks.change(owner, other, 0, {
    kind: "add",
    title: "Other card",
    parentId: null,
  });
  await assert.rejects(
    tasks.change(owner, other, foreign.revision, {
      kind: "attach",
      id: foreign.tasks[0]!.id,
      artifactId,
      remove: false,
    }),
  );
  list = await tasks.change(owner, id, list.revision, {
    kind: "attach",
    id: card.id,
    artifactId,
    remove: true,
  });
  assert.equal(list.attachments.length, 0);
  list = await tasks.change(owner, id, list.revision, {
    kind: "attach",
    id: card.id,
    artifactId,
    remove: false,
  });
  list = await tasks.change(owner, id, list.revision, {
    kind: "attach",
    id: card.id,
    artifactId,
    remove: false,
  });
  assert.equal(list.attachments.length, 1);
  list = await tasks.change(owner, id, list.revision, {
    kind: "delete",
    id: card.id,
    confirmed: true,
  });
  assert.equal(list.attachments.length, 0);
  assert.equal(
    (
      await db.query("SELECT id FROM project_artifacts WHERE project_id=$1 AND id=$2", [
        id,
        artifactId,
      ])
    ).rows.length,
    1,
  );
  await projects.deleteProject(owner, id, "Task test");
});

test("completed milestones require reopening, and card creation respects unassigned columns", async () => {
  const id = await project();
  await db.query(
    "INSERT INTO project_flows(project_id,flow_id,template_version,selected_by) VALUES($1,'self-improvement',1,$2)",
    [id, owner.userId],
  );
  let list = await tasks.change(owner, id, 0, {
    kind: "milestone-add",
    title: "Practice",
    description: "",
    templateId: "practice_cycle",
  });
  const milestone = list.milestones[0]!;
  list = await tasks.change(owner, id, list.revision, {
    kind: "add",
    title: "Reflect",
    parentId: null,
    milestoneId: milestone.id,
    columnId: "reviewed",
  });
  assert.equal(list.tasks[0]!.status, "done");
  list = await tasks.change(owner, id, list.revision, {
    kind: "milestone-edit",
    id: milestone.id,
    title: milestone.title,
    description: "",
    status: "completed",
  });
  await assert.rejects(
    tasks.change(owner, id, list.revision, {
      kind: "status",
      id: list.tasks[0]!.id,
      status: "ready",
    }),
    /Reopen/,
  );
  list = await tasks.change(owner, id, list.revision, {
    kind: "add",
    title: "Already started",
    parentId: null,
    columnId: "in_progress",
  });
  assert.equal(list.tasks[1]!.status, "in_progress");
  assert.equal(list.tasks[1]!.column_id, null);
  await projects.deleteProject(owner, id, "Task test");
});
