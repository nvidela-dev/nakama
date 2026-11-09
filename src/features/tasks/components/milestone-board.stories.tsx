import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MilestoneBoard } from "./milestone-board";
import { BoardCard } from "./board-card";
import type { TaskOperation } from "../input";
import { taskTree, type TaskSnapshot } from "../model";

const initial: TaskSnapshot = {
  revision: 7,
  attachments: [],
  milestones: [
    {
      id: "sprint",
      title: "First sprint",
      description: "Synthetic milestone",
      template_id: "build_sprint",
      flow_id: "saas",
      status: "active",
      position: 0,
    },
  ],
  tasks: [
    {
      id: "task",
      title: "Try the prototype",
      parent_id: null,
      status: "ready",
      collapsed: false,
      created_at: new Date("2026-01-01T00:00:00.000Z"),
      updated_at: new Date("2026-01-01T00:00:00.000Z"),
      milestone_id: null,
      column_id: "ready",
      board_position: 0,
    },
  ],
};

function Example({ succeed = false }: { succeed?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [calls, setCalls] = useState(0);
  const [last, setLast] = useState("");
  async function run(operation: TaskOperation, revision?: number) {
    setCalls((count) => count + 1);
    setLast(`${operation.kind}:${revision ?? initial.revision}`);
    setPending(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 800));
    setPending(false);
    setError(succeed ? "" : "Could not save tasks. Your draft is still here.");
    return succeed;
  }
  return (
    <>
      <p data-testid="operation-count">{calls}</p>
      <p data-testid="last-operation">{last}</p>
      <MilestoneBoard
        projectId="synthetic-project"
        flowId="saas"
        list={initial}
        visible={taskTree(initial.tasks)}
        pending={pending}
        run={run}
        error={error}
        renderTask={(node, move) => (
          <BoardCard
            node={node}
            projectId="synthetic-project"
            pending={pending}
            attachmentCount={0}
            showAttachments={() => {}}
            edit={() => {}}
            remove={() => {}}
            addChild={() => {}}
            move={move}
            status={() => {}}
          />
        )}
      />
    </>
  );
}
const meta = { title: "Features/Tasks/Milestone board", component: Example } satisfies Meta<
  typeof Example
>;
export default meta;
export const FailedSave: StoryObj<typeof meta> = {};
export const SuccessfulSave: StoryObj<typeof meta> = { args: { succeed: true } };
