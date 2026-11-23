import type { DatabaseRows, TaskStatus } from "@/shared/contracts/database.generated";
export type { TaskStatus } from "@/shared/contracts/database.generated";
export type ProjectTask = Pick<
  DatabaseRows["project_tasks"],
  | "id"
  | "parent_id"
  | "title"
  | "status"
  | "collapsed"
  | "created_at"
  | "updated_at"
  | "milestone_id"
  | "column_id"
  | "board_position"
>;
export type Milestone = Pick<
  DatabaseRows["project_milestones"],
  "id" | "title" | "description" | "template_id" | "flow_id" | "status" | "position"
>;
export type TaskAttachment = { task_id: string; artifact_id: string };
export type TaskSnapshot = {
  revision: number;
  tasks: ProjectTask[];
  milestones: Milestone[];
  attachments: TaskAttachment[];
};
export type TaskNode = ProjectTask & { number: string; depth: number; children: TaskNode[] };
export const taskStatusLabels: Record<TaskStatus, string> = {
  ready: "Ready",
  in_progress: "In progress",
  done: "Done",
};
export function taskTree(tasks: ProjectTask[]): TaskNode[] {
  const children = new Map<string | null, ProjectTask[]>();
  for (const task of tasks) {
    const siblings = children.get(task.parent_id);
    if (siblings) siblings.push(task);
    else children.set(task.parent_id, [task]);
  }
  function walk(parent: string | null, prefix = "", depth = 0): TaskNode[] {
    return (children.get(parent) ?? []).map((task, index) => {
      const number = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      return { ...task, number, depth, children: walk(task.id, number, depth + 1) };
    });
  }
  return walk(null);
}
export function descendants(task: TaskNode): TaskNode[] {
  return task.children.flatMap((child) => [child, ...descendants(child)]);
}

export function filterTaskTree(roots: TaskNode[], view: "board" | "list", status: string) {
  const matching = new Set<string>();
  function include(node: TaskNode): boolean {
    let keep = node.status === status;
    for (const child of node.children) if (include(child)) keep = true;
    if (keep) matching.add(node.id);
    return keep;
  }
  if (status !== "all" && view === "list") roots.forEach(include);
  const visible: TaskNode[] = [];
  function visit(node: TaskNode) {
    if (view === "board") {
      if (status === "all" || node.status === status) visible.push(node);
    } else {
      if (status !== "all" && !matching.has(node.id)) return;
      visible.push(node);
      if (status === "all" && node.collapsed) return;
    }
    node.children.forEach(visit);
  }
  roots.forEach(visit);
  return visible;
}

export type Editor = { title: string; revision: number } & (
  | { kind: "add"; parentId?: string; task?: never }
  | { kind: "edit" | "delete" | "done"; task: TaskNode; parentId?: never }
);
