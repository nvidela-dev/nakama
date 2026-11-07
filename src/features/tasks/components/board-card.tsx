"use client";

import Card from "antd/es/card";
import Dropdown from "antd/es/dropdown";
import type { MenuProps } from "antd";
import { Button, IconButton } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";

import { useT } from "@/shared/i18n/provider";
import { taskStatusLabels, type TaskNode, type TaskStatus } from "../model";

type Props = {
  node: TaskNode;
  projectId: string;
  pending: boolean;
  parent?: string | undefined;
  attachmentCount: number;
  showAttachments: () => void;
  edit: () => void;
  remove: () => void;
  addChild: () => void;
  move: () => void;
  status: (s: TaskStatus) => void;
};
export function BoardCard({
  node,
  projectId,
  pending,
  parent,
  attachmentCount,
  showAttachments,
  edit,
  remove,
  addChild,
  move,
  status,
}: Props) {
  const t = useT();

  const menu: MenuProps = {
    items: [
      { key: "edit", label: t("Edit task"), icon: <Icon name="edit" />, onClick: edit },
      { key: "move", label: t("Move card"), icon: <Icon name="arrowRight" />, onClick: move },
      {
        key: "status",
        label: t("Task status"),
        children: Object.entries(taskStatusLabels).map(([value, label]) => ({
          key: value,
          label: t(label),
          disabled: node.status === value,
          onClick: () => status(value as TaskStatus),
        })),
      },
      { key: "sub", label: t("Add subtask"), icon: <Icon name="plus" />, onClick: addChild },
      {
        key: "files",
        label: t("Artifacts"),
        icon: <Icon name="box" />,
        onClick: showAttachments,
      },
      { type: "divider" },
      {
        key: "delete",
        label: t("Delete task"),
        danger: true,
        icon: <Icon name="delete" />,
        onClick: remove,
      },
    ],
  };
  return (
    <Dropdown menu={menu} trigger={["contextMenu"]} disabled={pending}>
      <li
        data-task-id={node.id}
        className={`task-row task-${node.status}`}
        draggable={!pending}
        onDragStart={(event) => {
          event.dataTransfer.setData(
            "application/x-nakama-task",
            JSON.stringify({ projectId, id: node.id }),
          );
          event.dataTransfer.effectAllowed = "move";
        }}
      >
        <div>
          <Card size="small" hoverable styles={{ body: { padding: 10 } }}>
            <div className="flex items-start justify-between gap-2">
              <Button
                variant="ghost"
                className="task-title h-auto! min-w-0 whitespace-normal! text-left! justify-start! wrap-anywhere"
                disabled={pending}
                onClick={edit}
              >
                {node.title}
              </Button>
              <Dropdown trigger={["click"]} menu={menu} disabled={pending}>
                <IconButton variant="ghost" label={t("Card actions")}>
                  <Icon name="more" />
                </IconButton>
              </Dropdown>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="task-number">#{node.number}</span>
              {parent && (
                <span className="truncate" title={parent}>
                  {t("Subtask of")}: {parent}
                </span>
              )}
              {attachmentCount > 0 && (
                <IconButton label={t("Artifacts")} variant="ghost" onClick={showAttachments}>
                  <Icon name="box" />
                  {attachmentCount}
                </IconButton>
              )}
            </div>
          </Card>
        </div>
      </li>
    </Dropdown>
  );
}
