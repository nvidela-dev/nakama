import { taskStatusSchema } from "@/shared/contracts/domain-schemas";
import { z } from "zod";
import type { LockInProject, LockInTask, LockInState, TaskSnapshot } from "@/features/tasks/model";
import { taskTree } from "@/features/tasks/model";
const timestamp = z.iso.datetime({ offset: true });
const taskSchema: z.ZodType<LockInTask> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(200),
    title: z.string().trim().min(1).max(300),
    status: taskStatusSchema,
    collapsed: z.boolean().default(false),
    subtasks: z
      .array(taskSchema)
      .nullable()
      .transform((value) => value ?? [])
      .default([]),
    created_at: timestamp,
    updated_at: timestamp,
  }),
);
const projectSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(300),
  tasks: z
    .array(taskSchema)
    .nullable()
    .transform((v) => v ?? [])
    .default([]),
  created_at: timestamp,
  updated_at: timestamp,
});
export function validateLockInProject(input: unknown): LockInProject {
  // Bound recursion before running the recursive schema on an uploaded tree.
  let count = 0;
  const ids = new Set<string>();
  const root = input as { tasks?: unknown[] };
  const visit = (items: unknown, depth: number) => {
    if (items === null || items === undefined) return;
    if (!Array.isArray(items)) throw new Error("Invalid task tree");
    if (items.length && depth > 32) throw new Error("Invalid task tree");
    for (const item of items) {
      if (++count > 2000 || !item || typeof item !== "object") throw new Error("Invalid task tree");
      const task = item as { id?: unknown; subtasks?: unknown };
      if (typeof task.id !== "string" || ids.has(task.id)) throw new Error("Duplicate task ID");
      ids.add(task.id);
      visit(task.subtasks, depth + 1);
    }
  };
  if (!root || typeof root !== "object") throw new Error("Invalid project");
  visit(root.tasks, 0);
  return projectSchema.parse(input);
}
export function parseLockInFile(text: string): LockInState {
  if (new TextEncoder().encode(text).length > 512_000) throw new Error("File too large");
  const raw = z
    .object({
      version: z.literal(1),
      active_project: z.string(),
      projects: z.array(z.unknown()).min(1).max(100),
    })
    .parse(JSON.parse(text));
  const projects = raw.projects.map(validateLockInProject);
  if (new Set(projects.map((p) => p.id)).size !== projects.length)
    throw new Error("Duplicate project ID");
  return { ...raw, projects };
}
export function toLockIn(
  project: { id: string; name: string; created_at: Date | string },
  snapshot: TaskSnapshot,
): LockInState {
  const iso = (date: Date | string) => new Date(date).toISOString();
  const convert = (node: ReturnType<typeof taskTree>[number]): LockInTask => ({
    id: node.id,
    title: node.title,
    status: node.status,
    collapsed: node.collapsed,
    subtasks: node.children.map(convert),
    created_at: iso(node.created_at),
    updated_at: iso(node.updated_at),
  });
  const created_at = iso(project.created_at);
  const updated_at = snapshot.tasks.reduce(
    (latest, task) => (iso(task.updated_at) > latest ? iso(task.updated_at) : latest),
    created_at,
  );
  return {
    version: 1,
    active_project: project.id,
    projects: [
      {
        id: project.id,
        name: project.name,
        created_at,
        updated_at,
        tasks: taskTree(snapshot.tasks).map(convert),
      },
    ],
  };
}
