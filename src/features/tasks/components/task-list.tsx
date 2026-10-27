"use client";
import { Switch } from "@/shared/ui/switch";
import { TaskArtifacts } from "./task-artifacts";
import { MilestoneBoard } from "./milestone-board";
import type { FlowId } from "@/shared/contracts/database.generated";
import { Icon } from "@/shared/ui/icon";
import { Panel } from "@/shared/ui/panel";

import { Input, Select } from "@/shared/ui/controls";

import { Dialog } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

import { useMemo, useRef, useState, useTransition } from "react";
import { changeTask, type TaskResult } from "@/features/tasks/actions";
import type { TaskOperation } from "@/features/tasks/input";
import {
  descendants,
  taskTree,
  taskStatusLabels,
  type TaskNode,
  type TaskSnapshot,
  type TaskStatus,
} from "@/features/tasks/model";
import { useT } from "@/shared/i18n/provider";
type Editor = { title: string; revision: number } & (
  | { kind: "add"; parentId?: string; task?: never }
  | { kind: "edit" | "delete" | "done"; task: TaskNode; parentId?: never }
);
export function TaskList({
  projectId,
  initial,
  flowId = null,
  artifacts = [],
}: {
  projectId: string;
  initial: TaskSnapshot;
  flowId?: FlowId | null;
  artifacts?: { id: string; name: string }[];
}) {
  const t = useT();
  const [list, setList] = useState(initial),
    [pending, startTransition] = useTransition();
  const [editor, setEditor] = useState<Editor | null>(null),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [notice, setNotice] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [filter, setFilter] = useState("all");
  const opener = useRef<HTMLElement | null>(null);
  if (initial.revision > list.revision) setList(initial);
  const tree = useMemo(() => taskTree(list.tasks), [list.tasks]);
  const completed = list.tasks.filter((task) => task.status === "done").length;
  function open(value: Editor) {
    opener.current = document.activeElement as HTMLElement;
    setError("");
    setConflict(false);
    setEditor(value);
  }
  function close() {
    setEditor(null);
    setError("");
    setConflict(false);
    requestAnimationFrame(() => opener.current?.isConnected && opener.current.focus());
  }
  function apply(result: TaskResult, closeAfter: boolean) {
    if (result.snapshot) setList(result.snapshot);
    if (result.error) {
      setError(result.error);
      setConflict(!!result.conflict);
      return;
    }
    setError("");
    setConflict(false);
    setNotice("Task list saved.");
    if (closeAfter) close();
  }
  function run(operation: TaskOperation, revision = list.revision, closeAfter = false) {
    setNotice("");
    return new Promise<boolean>((resolve) =>
      startTransition(async () => {
        try {
          const result = await changeTask(projectId, revision, operation);
          apply(result, closeAfter);
          resolve(!result.error);
        } catch {
          setError("Could not save tasks. Your draft is still here.");
          resolve(false);
        }
      }),
    );
  }

  function mark(node: TaskNode, status: TaskStatus) {
    if (status === "done" && node.children.length)
      open({ kind: "done", task: node, title: node.title, revision: list.revision });
    else run({ kind: "status", id: node.id, status });
  }
  const filtering = filter !== "all";
  const matches = (node: TaskNode) => filter === "all" || node.status === filter;
  const containsMatch = (node: TaskNode): boolean =>
    matches(node) || node.children.some(containsMatch);
  const visible: TaskNode[] = [];
  const walk = (nodes: TaskNode[]) => {
    for (const node of nodes) {
      if (view === "board") {
        if (matches(node)) visible.push(node);
        walk(node.children);
        continue;
      }
      if (filtering && !containsMatch(node)) continue;
      visible.push(node);
      if (filtering || !node.collapsed) walk(node.children);
    }
  };
  walk(tree);
  const errorBox = error && (
    <div className="task-feedback">
      <p
        className={
          "message error text-[13px]! rounded-[8px] p-3 text-ink! m-0 bg-[var(--theme-danger,#4e3030)] [color:var(--theme-danger-ink,#ffe4dd)]!"
        }
        role="alert"
      >
        {t(error)}
      </p>
      {conflict && editor?.task && (
        <p className={"mb-[1em] mt-0"}>
          {t("Latest task title:")}{" "}
          {list.tasks.find((task) => task.id === editor.task?.id)?.title ??
            t("Task no longer exists.")}
        </p>
      )}
      {conflict && editor && (
        <Button
          type="button"
          className={"button secondary"}
          disabled={pending}
          onClick={() => {
            if (editor) {
              const find = (nodes: TaskNode[]): TaskNode | undefined => {
                for (const node of nodes) {
                  if (node.id === editor.task?.id) return node;
                  const child = find(node.children);
                  if (child) return child;
                }
                return undefined;
              };
              const fresh = editor.task ? find(tree) : undefined;
              if (editor.task && !fresh) {
                setError("Task not found.");
                setConflict(false);
                return;
              }
              if (editor.kind === "add") setEditor({ ...editor, revision: list.revision });
              else if (fresh)
                setEditor({
                  ...editor,
                  task: fresh,
                  revision: list.revision,
                  title: editor.kind === "edit" ? editor.title : fresh.title,
                });
            }
            setError("");
            setConflict(false);
          }}
          variant="secondary"
        >
          {t("Use latest list and keep my draft")}
        </Button>
      )}
    </div>
  );
  function renderTask(node: TaskNode) {
    return (
      <li
        key={node.id}
        data-task-id={node.id}
        draggable={view === "board" && !pending}
        onDragStart={(event) => {
          event.dataTransfer.setData(
            "application/x-nakama-task",
            JSON.stringify({ projectId, id: node.id }),
          );
          event.dataTransfer.effectAllowed = "move";
        }}
        className={[
          `task-row task-${node.status}`,
          node.status === "done" && "[&_.task-title]:text-muted [&_.task-title]:line-through",
          node.status === "in_progress" && "[&_.task-title]:text-lime",
          view === "board"
            ? "grid gap-3 p-3 border border-line rounded-[9px] bg-panel min-w-0"
            : "flex flex-wrap items-center justify-between gap-[6px_12px] py-2.25 px-0 border-b border-b-line min-w-0",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ marginLeft: view === "board" ? 0 : Math.min(node.depth, 4) * 12 }}
      >
        <div
          className={
            "task-main flex items-center [flex:1_1_210px] min-w-0 gap-2 max-[700px]:[flex-basis:100%]"
          }
        >
          {view === "list" && node.children.length > 0 ? (
            <Button
              type="button"
              className={
                "task-expand text-ink bg-transparent p-0 rounded-[4px] min-h-8 text-[13px] text-left [flex:0_0_26px] pointer-coarse:min-h-11 pointer-coarse:min-w-11"
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
            className={
              "task-title text-ink bg-transparent p-1 rounded-[4px] min-h-8 text-[13px] text-left block wrap-anywhere min-w-0 hover:bg-line hover:[transform:none]"
            }
            disabled={pending}
            onClick={() =>
              open({ kind: "edit", task: node, title: node.title, revision: list.revision })
            }
          >
            {node.title}
          </Button>
        </div>
        {view === "board" && node.parent_id && (
          <p className="text-[11px] text-muted wrap-anywhere">
            {t("Subtask of")}: {list.tasks.find((task) => task.id === node.parent_id)?.title}
          </p>
        )}
        {view === "board" && (
          <details className="min-w-0">
            <summary className="text-xs cursor-pointer">
              {t("Artifacts")} ({list.attachments.filter((a) => a.task_id === node.id).length})
            </summary>
            <TaskArtifacts
              projectId={projectId}
              taskId={node.id}
              items={artifacts}
              attached={list.attachments
                .filter((a) => a.task_id === node.id)
                .map((a) => a.artifact_id)}
              run={run}
              pending={pending}
            />
          </details>
        )}
        <div className={"task-row-controls flex flex-wrap items-center gap-1.5 min-w-0"}>
          <Select
            aria-label={`${t("Task status")} ${node.number}`}
            disabled={pending}
            value={node.status}
            onChange={(e) => mark(node, e.target.value as TaskStatus)}
            className={
              "w-32.5 min-h-9 py-2 px-2.5 text-[11px] bg-bg text-ink border border-line rounded-[6px] font-sans pointer-coarse:min-h-11"
            }
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
              "button secondary task-icon w-8 h-8 min-h-8 p-0 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
            }
            title={t("Add subtask")}
            aria-label={`${t("Add subtask")} ${node.number}`}
            disabled={pending}
            onClick={() =>
              open({ kind: "add", parentId: node.id, title: "", revision: list.revision })
            }
            variant="secondary"
          >
            <Icon name="plus" />
          </Button>
          <Button
            type="button"
            className={
              "button secondary task-icon w-8 h-8 min-h-8 p-0 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
            }
            title={t("Delete task")}
            aria-label={`${t("Delete task")} ${node.number}`}
            disabled={pending}
            onClick={() =>
              open({ kind: "delete", task: node, title: node.title, revision: list.revision })
            }
            variant="secondary"
          >
            <Icon name="delete" />
          </Button>
        </div>
      </li>
    );
  }
  const controls = (
    <>
      <small className="text-muted text-[11px] whitespace-nowrap">
        {completed}/{list.tasks.length} {t("tasks done")}
      </small>
      <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label={t("Task view")}>
        <span title={t("Board")} className={view === "board" ? "text-lime" : "text-muted"}>
          <Icon name="board" size={18} />
        </span>
        <Switch
          label={t("Nested list")}
          checked={view === "list"}
          onCheckedChange={(checked) => setView(checked ? "list" : "board")}
        />
        <span title={t("Nested list")} className={view === "list" ? "text-lime" : "text-muted"}>
          <Icon name="listTree" size={18} />
        </span>
      </div>
      <Select
        aria-label={t("Task status")}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        className="w-36 min-w-0 shrink-0 bg-bg text-ink border border-line rounded-md font-sans py-1.5 px-2 min-h-8 text-xs pointer-coarse:min-h-11"
      >
        <option value="all">{t("All statuses")}</option>
        {Object.entries(taskStatusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {t(label)}
          </option>
        ))}
      </Select>
    </>
  );
  const addTaskButton = (
    <Button
      type="button"
      disabled={pending}
      onClick={() => open({ kind: "add", title: "", revision: list.revision })}
    >
      {t("Add task")}
    </Button>
  );
  const feedback = (
    <>
      {!editor && errorBox}
      {notice && (
        <p className="text-xs text-muted py-1" role="status">
          {t(notice)}
        </p>
      )}
    </>
  );
  return (
    <Panel className="task-list max-[700px]:p-4" aria-label={t("Project to-do list")}>
      {view === "board" ? (
        <MilestoneBoard
          projectId={projectId}
          flowId={flowId}
          list={list}
          visible={visible}
          pending={pending}
          run={run}
          renderTask={renderTask}
          error={error}
          toolbar={controls}
          actions={addTaskButton}
          feedback={feedback}
        />
      ) : (
        <>
          <div className="task-toolbar flex flex-wrap items-center gap-2 mb-3">
            {controls}
            <div className="flex-1" />
            <Button
              variant="secondary"
              disabled={pending || !list.tasks.length}
              onClick={() =>
                run({ kind: "collapse", ids: list.tasks.map((task) => task.id), collapsed: false })
              }
            >
              {t("Expand all")}
            </Button>
            <Button
              variant="secondary"
              disabled={pending || !list.tasks.length}
              onClick={() =>
                run({ kind: "collapse", ids: list.tasks.map((task) => task.id), collapsed: true })
              }
            >
              {t("Collapse all")}
            </Button>
            {addTaskButton}
          </div>
          {feedback}
          {!visible.length ? (
            <p>{t("No matching tasks.")}</p>
          ) : (
            <ol className="task-tree list-none p-0 m-0">{visible.map(renderTask)}</ol>
          )}
        </>
      )}
      {editor && (
        <Dialog
          open
          onClose={close}
          dismissible={!pending}
          className={
            "task-dialog [&_select]:w-full [&_select]:min-w-0 [&_select]:bg-bg [&_select]:text-ink [&_select]:border [&_select]:border-line [&_select]:rounded-[6px] [&_select]:font-sans [&_select]:py-2 [&_select]:px-2.5 [&_select]:min-h-9 w-[min(580px,_calc(100vw_-_32px))] max-h-[calc(100dvh_-_48px)] overflow-y-auto p-6 border border-line rounded-[12px] bg-bg text-ink backdrop:[background:#000a] [&_.task-feedback]:mt-3"
          }
          labelledBy="task-editor-heading"
        >
          <form
            className={
              "form-stack flex flex-col gap-3 [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[var(--theme-border,#4b6056)] [&_textarea]:bg-bg [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_select]:bg-bg [&_select]:text-ink [&_select]:border [&_select]:border-[var(--theme-border,#4b6056)] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:outline-3 [&_select:focus-visible]:outline-solid [&_select:focus-visible]:outline-lime [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
            }
            onSubmit={(event) => {
              event.preventDefault();
              if (editor.kind === "add")
                run(
                  { kind: "add", title: editor.title, parentId: editor.parentId ?? null },
                  editor.revision,
                  true,
                );
              else if (editor.kind === "edit")
                run(
                  { kind: "edit", id: editor.task.id, title: editor.title },
                  editor.revision,
                  true,
                );
              else if (editor.kind === "delete")
                run({ kind: "delete", id: editor.task.id, confirmed: true }, editor.revision, true);
            }}
          >
            <h2
              id="task-editor-heading"
              className={
                "font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 m-0"
              }
            >
              {t(
                editor.kind === "add"
                  ? editor.parentId
                    ? "Add subtask"
                    : "Add task"
                  : editor.kind === "edit"
                    ? "Edit task"
                    : editor.kind === "delete"
                      ? "Delete task"
                      : "Complete task",
              )}
            </h2>
            {editor.kind === "add" || editor.kind === "edit" ? (
              <label className={"grid gap-1.5 text-[13px] text-ink"}>
                {t("Task title")}
                <Input
                  autoFocus
                  required
                  maxLength={300}
                  disabled={pending}
                  value={editor.title}
                  onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                  className={
                    "min-w-0 font-sans min-h-9 w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                  }
                />
              </label>
            ) : (
              <>
                <p className={"preserve-lines mb-[1em] mt-0 whitespace-pre-wrap wrap-anywhere"}>
                  {editor.task.number} · {editor.title}
                </p>
                <p className={"mb-[1em] mt-0"}>
                  {t(
                    editor.kind === "delete"
                      ? "Delete this task and all its subtasks? This cannot be undone."
                      : "Complete only this task, or include all its subtasks?",
                  )}
                </p>
                <small className={"text-[11px] text-muted"}>
                  {descendants(editor.task).length} {t("subtasks")}
                </small>
              </>
            )}
            {errorBox}
            <div className={"task-dialog-actions flex flex-wrap gap-2 mt-4"}>
              {editor.kind === "done" ? (
                <>
                  <Button
                    type="button"
                    disabled={pending || conflict}
                    onClick={() =>
                      run(
                        {
                          kind: "status",
                          id: editor.task.id,
                          status: "done",
                          scope: "task",
                          confirmed: true,
                        },
                        editor.revision,
                        true,
                      )
                    }
                    className={"mt-2 lg:compact:mt-1"}
                  >
                    {t("Only this task")}
                  </Button>
                  <Button
                    type="button"
                    disabled={pending || conflict}
                    onClick={() =>
                      run(
                        {
                          kind: "status",
                          id: editor.task.id,
                          status: "done",
                          scope: "subtree",
                          confirmed: true,
                        },
                        editor.revision,
                        true,
                      )
                    }
                    className={"mt-2 lg:compact:mt-1"}
                  >
                    {t("Task and subtasks")}
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  disabled={pending || conflict}
                  className={"mt-2 lg:compact:mt-1"}
                >
                  {t(
                    pending
                      ? "Saving…"
                      : editor.kind === "delete"
                        ? "Confirm deletion"
                        : "Save task",
                  )}
                </Button>
              )}
              <Button
                type="button"
                className={"button secondary mt-2 lg:compact:mt-1"}
                disabled={pending}
                onClick={close}
                variant="secondary"
              >
                {t("Cancel")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Panel>
  );
}
