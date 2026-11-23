import type { Meta } from "@storybook/nextjs-vite";
import { TaskTreeRow } from "./task-tree-row";
import type { TaskNode } from "../model";
export default { title: "Tasks/Tree row" } satisfies Meta;
const node: TaskNode = {
  id: "review",
  title: "Review the prototype",
  number: "1.1",
  depth: 1,
  children: [],
  status: "in_progress",
  parent_id: "prototype",
  collapsed: false,
  created_at: new Date(0),
  updated_at: new Date(0),
  milestone_id: null,
  column_id: null,
  board_position: 0,
};
export const InProgress = {
  render: () => (
    <ul>
      <TaskTreeRow
        node={node}
        revision={1}
        pending={false}
        filtering={false}
        run={async () => true}
        open={() => {}}
        mark={() => {}}
      />
    </ul>
  ),
};
