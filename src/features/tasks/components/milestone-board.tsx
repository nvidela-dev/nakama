"use client";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input, Select } from "@/shared/ui/controls";
import { Dialog } from "@/shared/ui/dialog";
import { useT } from "@/shared/i18n/provider";
import type { FlowId } from "@/shared/contracts/database.generated";
import type { TaskOperation } from "../input";
import { taskStatusLabels, type TaskNode, type TaskSnapshot } from "../model";
import {
  allowedTemplates,
  milestoneTemplates,
  type MilestoneTemplateId,
} from "../milestone-catalog";

type Props = {
  projectId: string;
  flowId: FlowId | null;
  list: TaskSnapshot;
  visible: TaskNode[];
  pending: boolean;
  run: (op: TaskOperation, revision?: number) => Promise<boolean>;
  error: string;
  toolbar?: React.ReactNode;
  actions?: React.ReactNode;
  feedback?: React.ReactNode;
  renderTask: (task: TaskNode) => React.ReactNode;
};
export function MilestoneBoard({
  projectId,
  flowId,
  list,
  visible,
  pending,
  run,
  renderTask,
  error,
  toolbar,
  actions,
  feedback,
}: Props) {
  const t = useT();
  const [newCards, setNewCards] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState("");
  const [draftRevision, setDraftRevision] = useState(list.revision);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("");
  const [move, setMove] = useState<{
    id: string;
    milestoneId: string;
    columnId: string;
    beforeId: string;
  } | null>(null);
  const milestone = list.milestones.find((m) => m.id === selected);
  const templates = allowedTemplates(flowId);
  const coreColumns = Object.entries(taskStatusLabels).map(([id, name]) => ({
    id,
    name,
    status: id,
  }));
  const columns = milestone
    ? milestoneTemplates[milestone.template_id as MilestoneTemplateId].columns
    : coreColumns;
  const moveMilestone = list.milestones.find((m) => m.id === move?.milestoneId);
  const moveColumns = moveMilestone
    ? milestoneTemplates[moveMilestone.template_id as MilestoneTemplateId].columns
    : coreColumns;
  const cardsFor = (column: string) =>
    visible
      .filter(
        (task) =>
          task.milestone_id === (milestone?.id ?? null) &&
          (milestone ? task.column_id === column : task.status === column),
      )
      .sort((a, b) => a.board_position - b.board_position);
  function requestMove(id: string, columnId: string, beforeId: string | null) {
    if (id === beforeId) return;
    const task = list.tasks.find((task) => task.id === id);
    const destination = columns.find((column) => column.id === columnId);
    if (!task || !destination) return;
    if (destination.status === "done" && list.tasks.some((task) => task.parent_id === id)) {
      setMove({ id, milestoneId: milestone?.id ?? "", columnId, beforeId: beforeId ?? "" });
      return;
    }
    run({ kind: "move", id, milestoneId: milestone?.id ?? null, columnId, beforeId });
  }
  function drop(event: React.DragEvent, column: string, beforeId: string | null) {
    event.preventDefault();
    event.stopPropagation();
    if (pending || (milestone?.status && milestone.status !== "active")) return;
    try {
      const data = JSON.parse(event.dataTransfer.getData("application/x-nakama-task"));
      if (data.projectId === projectId && typeof data.id === "string")
        requestMove(data.id, column, beforeId);
    } catch {
      /* Ignore external drags. */
    }
  }
  return (
    <div className="grid gap-3">
      <div className="task-toolbar flex flex-wrap items-center gap-2">
        {toolbar}
        <label className="flex-1 min-w-40">
          <span className="sr-only">{t("Milestone board")}</span>
          <Select
            className="w-full min-w-0 border border-line rounded-md bg-bg text-ink px-2 py-1.5 text-xs min-h-8 pointer-coarse:min-h-11"
            value={milestone?.id ?? ""}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">{t("Unassigned tasks")}</option>
            {list.milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ·{" "}
                {t(
                  m.status === "active"
                    ? "Active"
                    : m.status === "completed"
                      ? "Completed"
                      : "Archived",
                )}
              </option>
            ))}
          </Select>
        </label>
        <Button
          disabled={pending || !templates.length}
          onClick={() => {
            setTitle("");
            setDescription("");
            setTemplate(templates[0]?.id ?? "");
            setDraftRevision(list.revision);
            setEditing(true);
          }}
        >
          {t("New milestone")}
        </Button>
        {milestone && (
          <>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setTitle(milestone.title);
                setDescription(milestone.description);
                setTemplate("");
                setDraftRevision(list.revision);
                setEditing(true);
              }}
            >
              {t("Manage milestone")}
            </Button>
            <Button
              variant="secondary"
              disabled={pending || list.milestones[0]?.id === milestone.id}
              onClick={() =>
                run({
                  kind: "milestone-order",
                  id: milestone.id,
                  beforeId:
                    list.milestones[
                      Math.max(0, list.milestones.findIndex((m) => m.id === milestone.id) - 1)
                    ]!.id,
                })
              }
            >
              {t("Move milestone earlier")}
            </Button>
          </>
        )}
        {actions}
      </div>
      {feedback}
      {!flowId && (
        <p className="text-xs text-muted">
          {t("Choose a project flow to create milestone boards.")}
        </p>
      )}
      {milestone?.description && (
        <p className="text-xs text-muted whitespace-pre-wrap">{milestone.description}</p>
      )}
      <div
        className={`task-board grid grid-cols-1 ${milestone ? "min-[900px]:grid-cols-4" : "min-[900px]:grid-cols-3"} gap-2 items-start`}
        aria-label={t("Task board")}
      >
        {columns.map((column) => {
          const cards = cardsFor(column.id);
          return (
            <section
              key={column.id}
              aria-label={t(column.name)}
              className="min-w-0 border border-line bg-panel rounded-md p-2 min-h-40"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => drop(event, column.id, null)}
            >
              <h3 className="text-xs font-semibold mb-2">
                {t(column.name)} <span className="text-muted">{cards.length}</span>
              </h3>
              <ol className="grid gap-2 list-none p-0 m-0">
                {cards.map((task) => (
                  <li
                    key={task.id}
                    className="min-w-0"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => drop(event, column.id, task.id)}
                  >
                    <ol className="list-none p-0 m-0">{renderTask(task)}</ol>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Button
                        variant="secondary"
                        disabled={pending}
                        onClick={() =>
                          setMove({
                            id: task.id,
                            milestoneId: milestone?.id ?? "",
                            columnId: column.id,
                            beforeId: "",
                          })
                        }
                      >
                        {t("Move card")}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={
                          pending ||
                          cards[0]?.id === task.id ||
                          (milestone?.status !== undefined && milestone.status !== "active")
                        }
                        onClick={() =>
                          requestMove(
                            task.id,
                            column.id,
                            cards[cards.findIndex((c) => c.id === task.id) - 1]!.id,
                          )
                        }
                      >
                        {t("Move up")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
              {(!milestone || milestone.status === "active") && (
                <form
                  className="grid gap-1 mt-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const saved = await run({
                      kind: "add",
                      title: newCards[column.id] ?? "",
                      parentId: null,
                      milestoneId: milestone?.id ?? null,
                      columnId: column.id,
                    });
                    if (saved) setNewCards({ ...newCards, [column.id]: "" });
                  }}
                >
                  <Input
                    className="w-full min-w-0 border border-line rounded-md bg-bg text-ink px-2 py-1.5 text-xs min-h-8 pointer-coarse:min-h-11"
                    aria-label={`${t("New card")} ${t(column.name)}`}
                    value={newCards[column.id] ?? ""}
                    maxLength={300}
                    required
                    onChange={(event) =>
                      setNewCards({ ...newCards, [column.id]: event.target.value })
                    }
                  />
                  <Button type="submit" disabled={pending || !newCards[column.id]?.trim()}>
                    {t("Add card")}
                  </Button>
                </form>
              )}
              {!cards.length && (
                <p className="text-xs text-muted">{t("No tasks in this column.")}</p>
              )}
            </section>
          );
        })}
      </div>
      {editing && (
        <Dialog
          open
          onClose={() => setEditing(false)}
          labelledBy="milestone-title"
          className="p-4 bg-bg text-ink border border-line rounded-lg w-[min(520px,calc(100vw-32px))]"
        >
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              let saved = false;
              if (template)
                saved = await run(
                  { kind: "milestone-add", title, description, templateId: template },
                  draftRevision,
                );
              else if (milestone)
                saved = await run(
                  {
                    kind: "milestone-edit",
                    id: milestone.id,
                    title,
                    description,
                    status: milestone.status,
                  },
                  draftRevision,
                );
              if (saved) setEditing(false);
            }}
          >
            {error && (
              <div role="alert">
                {t(error)}
                <Button variant="secondary" onClick={() => setDraftRevision(list.revision)}>
                  {t("Use latest list and keep my draft")}
                </Button>
              </div>
            )}
            <h2 id="milestone-title">{t(template ? "New milestone" : "Manage milestone")}</h2>
            <label className="grid gap-1">
              {t("Milestone title")}
              <Input
                className="w-full min-w-0 border border-line rounded-md bg-bg text-ink px-2 py-1.5 text-xs min-h-8 pointer-coarse:min-h-11"
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="grid gap-1">
              {t("Description")}
              <Input
                className="w-full min-w-0 border border-line rounded-md bg-bg text-ink px-2 py-1.5 text-xs min-h-8 pointer-coarse:min-h-11"
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            {template && (
              <label className="grid gap-1">
                {t("Board template")}
                <Select
                  className="w-full min-w-0 border border-line rounded-md bg-bg text-ink px-2 py-1.5 text-xs min-h-8 pointer-coarse:min-h-11"
                  value={template}
                  onChange={(event) => setTemplate(event.target.value)}
                >
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {t(item.name)}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                {t("Save milestone")}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                {t("Cancel")}
              </Button>
            </div>
            {!template && milestone && (
              <div className="grid gap-2 border-t border-line pt-3">
                {(["active", "completed", "archived"] as const)
                  .filter((status) => status !== milestone.status)
                  .map((status) => (
                    <Button
                      key={status}
                      variant="secondary"
                      disabled={pending}
                      onClick={() => {
                        run({
                          kind: "milestone-edit",
                          id: milestone.id,
                          title: milestone.title,
                          description: milestone.description,
                          status,
                        });
                        setEditing(false);
                      }}
                    >
                      {t(
                        status === "active"
                          ? "Reopen milestone"
                          : status === "completed"
                            ? "Complete milestone"
                            : "Archive milestone",
                      )}
                    </Button>
                  ))}
                <p className="text-xs text-muted">
                  {t(
                    "Deleting a milestone returns its cards to unassigned tasks. Tasks and subtasks are preserved.",
                  )}
                </p>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    run({ kind: "milestone-delete", id: milestone.id, confirmed: true });
                    setEditing(false);
                  }}
                >
                  {t("Delete milestone and keep tasks")}
                </Button>
              </div>
            )}
          </form>
        </Dialog>
      )}
      {move && (
        <Dialog
          open
          onClose={() => setMove(null)}
          labelledBy="move-card-title"
          className="p-4 bg-bg text-ink border border-line rounded-lg w-[min(520px,calc(100vw-32px))]"
        >
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const saved = await run({
                kind: "move",
                id: move.id,
                milestoneId: move.milestoneId || null,
                columnId: move.columnId,
                beforeId: move.beforeId || null,
                confirmed: true,
              });
              if (saved) setMove(null);
            }}
          >
            {error && <p role="alert">{t(error)}</p>}
            <h2 id="move-card-title">{t("Move card")}</h2>
            <label className="grid gap-1">
              {t("Destination board")}
              <Select
                className="w-full min-w-0 border border-line rounded-md bg-bg text-ink px-2 py-1.5 text-xs min-h-8 pointer-coarse:min-h-11"
                value={move.milestoneId}
                onChange={(event) => {
                  const m = list.milestones.find((m) => m.id === event.target.value);
                  setMove({
                    ...move,
                    milestoneId: event.target.value,
                    columnId: m
                      ? milestoneTemplates[m.template_id as MilestoneTemplateId].columns[0]!.id
                      : "ready",
                    beforeId: "",
                  });
                }}
              >
                <option value="">{t("Unassigned tasks")}</option>
                {list.milestones
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
              </Select>
            </label>
            <label className="grid gap-1">
              {t("Destination column")}
              <Select
                className="w-full min-w-0 border border-line rounded-md bg-bg text-ink px-2 py-1.5 text-xs min-h-8 pointer-coarse:min-h-11"
                value={move.columnId}
                onChange={(event) =>
                  setMove({ ...move, columnId: event.target.value, beforeId: "" })
                }
              >
                {moveColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.name)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1">
              {t("Place before")}
              <Select
                className="w-full min-w-0 border border-line rounded-md bg-bg text-ink px-2 py-1.5 text-xs min-h-8 pointer-coarse:min-h-11"
                value={move.beforeId}
                onChange={(event) => setMove({ ...move, beforeId: event.target.value })}
              >
                <option value="">{t("End of column")}</option>
                {list.tasks
                  .filter(
                    (task) =>
                      task.id !== move.id &&
                      task.milestone_id === (move.milestoneId || null) &&
                      (move.milestoneId
                        ? task.column_id === move.columnId
                        : task.status === move.columnId),
                  )
                  .sort((a, b) => a.board_position - b.board_position)
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </Select>
            </label>
            <p className="text-xs text-muted">
              {t("Only this card moves. Its subtasks keep their own status and board.")}
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {t("Confirm move")}
              </Button>
              <Button variant="secondary" onClick={() => setMove(null)}>
                {t("Cancel")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
