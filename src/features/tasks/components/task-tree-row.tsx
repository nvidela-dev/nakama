"use client";
import { Icon } from "@/shared/ui/icon";
import { Select } from "@/shared/ui/controls";
import { Button } from "@/shared/ui/button";
import type { TaskOperation } from "@/features/tasks/input";
import { taskStatusLabels, type TaskNode, type TaskStatus } from "@/features/tasks/model";
import { useT } from "@/shared/i18n/provider";
import type { Editor } from "../model";

export function TaskTreeRow({
  node,
  pending,
  filtering,
  run,
  open,
  revision,
  mark,
}: {
  node: TaskNode;
  pending: boolean;
  filtering: boolean;
  run: (operation: TaskOperation, revision?: number, closeAfter?: boolean) => Promise<boolean>;
  open: (value: Editor) => void;
  revision: number;
  mark: (node: TaskNode, status: TaskStatus) => void;
}) {
  const t = useT();
  return (
    <li
      data-task-id={node.id}
      className={[
        `task-row task-${node.status}`,
        node.status === "done" && "[&_.task-title]:text-muted [&_.task-title]:line-through",
        node.status === "in_progress" && "[&_.task-title]:text-lime",
        "flex flex-wrap items-center justify-between gap-2 py-2 border-b border-line min-w-0",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ marginLeft: Math.min(node.depth, 4) * 12 }}
    >
      <div
        className={
          "task-main flex items-center [flex:1_1_210px] min-w-0 gap-2 max-[700px]:[flex-basis:100%]"
        }
      >
        {node.children.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            className={
              "task-expand min-h-8 text-left [flex:0_0_26px] pointer-coarse:min-h-11 pointer-coarse:min-w-11"
            }
            disabled={pending}
            aria-label={t(node.collapsed ? "Expand subtasks" : "Collapse subtasks")}
            aria-expanded={node.children.length ? filtering || !node.collapsed : undefined}
            onClick={() => run({ kind: "collapse", ids: [node.id], collapsed: !node.collapsed })}
          >
            <Icon name={filtering || !node.collapsed ? "chevronDown" : "chevronRight"} />
          </Button>
        ) : (
          <span
            className={
              "task-leaf [flex:0_0_26px] text-center text-muted pointer-coarse:[flex-basis:44px]"
            }
            aria-hidden="true"
          >
            ·
          </span>
        )}
        <span className={"task-number text-lime text-[11px] wrap-anywhere max-w-[5em] shrink-0"}>
          {node.number}
        </span>
        <Button
          type="button"
          variant="ghost"
          className={
            "task-title min-h-8 text-left block wrap-anywhere min-w-0 hover:[transform:none]"
          }
          disabled={pending}
          onClick={() => open({ kind: "edit", task: node, title: node.title, revision })}
        >
          {node.title}
        </Button>
      </div>
      <div className={"task-row-controls flex flex-wrap items-center gap-1.5 min-w-0"}>
        <Select
          aria-label={`${t("Task status")} ${node.number}`}
          disabled={pending}
          value={node.status}
          onChange={(e) => mark(node, e.target.value as TaskStatus)}
          className={"w-32.5 min-h-9 pointer-coarse:min-h-11"}
        >
          {Object.entries(taskStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          className={
            "button secondary task-icon w-8 h-8 min-h-8 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
          }
          title={t("Add subtask")}
          aria-label={`${t("Add subtask")} ${node.number}`}
          disabled={pending}
          onClick={() => open({ kind: "add", parentId: node.id, title: "", revision })}
          variant="secondary"
        >
          <Icon name="plus" />
        </Button>
        <Button
          type="button"
          className={
            "button secondary task-icon w-8 h-8 min-h-8 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
          }
          title={t("Delete task")}
          aria-label={`${t("Delete task")} ${node.number}`}
          disabled={pending}
          onClick={() => open({ kind: "delete", task: node, title: node.title, revision })}
          variant="secondary"
        >
          <Icon name="delete" />
        </Button>
      </div>
    </li>
  );
}
