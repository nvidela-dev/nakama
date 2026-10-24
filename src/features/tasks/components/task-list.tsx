"use client";
import { Icon } from "@/shared/ui/icon";
import { Panel } from "@/shared/ui/panel";

import { Input, Select } from "@/shared/ui/controls";

import { Dialog } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { changeTask, exportTasks, importTasks, type TaskResult } from "@/features/tasks/actions";
import type { TaskOperation } from "@/features/tasks/input";
import {
  descendants,
  taskTree,
  taskStatusLabels,
  type LockInProject,
  type TaskNode,
  type TaskSnapshot,
  type TaskStatus,
} from "@/features/tasks/model";
import { parseLockInFile } from "@/features/tasks/lockin-format";
import { useT } from "@/shared/i18n/provider";
type Editor = { title: string; revision: number } & (
  | { kind: "add"; parentId?: string; task?: never }
  | { kind: "edit" | "delete" | "done"; task: TaskNode; parentId?: never }
);
export function TaskList({ projectId, initial }: { projectId: string; initial: TaskSnapshot }) {
  const t = useT();
  const [list, setList] = useState(initial),
    [pending, startTransition] = useTransition();
  const [editor, setEditor] = useState<Editor | null>(null),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const [imports, setImports] = useState<LockInProject[]>([]),
    [selected, setSelected] = useState(0),
    [importRevision, setImportRevision] = useState(initial.revision);
  const opener = useRef<HTMLElement | null>(null),
    file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setList((current) => (initial.revision > current.revision ? initial : current));
  }, [initial]);
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
    setImports([]);
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
    startTransition(async () => {
      try {
        apply(await changeTask(projectId, revision, operation), closeAfter);
      } catch {
        setError("Could not save tasks. Your draft is still here.");
      }
    });
  }
  function download() {
    startTransition(async () => {
      try {
        const { data, error } = await exportTasks(projectId);
        if (error) setError(error);
        else if (data) setNotice("Export ready.");
        if (data) {
          const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "lock-in-project.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch {
        setError("Could not export tasks.");
      }
    });
  }
  async function readFile(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    setError("");
    try {
      if (chosen.size > 512_000) throw new Error();
      const state = parseLockInFile(await chosen.text());
      setImports(state.projects);
      setSelected(
        Math.max(
          0,
          state.projects.findIndex((p) => p.id === state.active_project),
        ),
      );
      setImportRevision(list.revision);
    } catch {
      setError(
        "Choose a valid Lock-In version 1 JSON file up to 512 KB. Task titles must be at most 300 characters.",
      );
    } finally {
      input.value = "";
    }
  }
  function mark(node: TaskNode, status: TaskStatus) {
    if (status === "done" && node.children.length)
      open({ kind: "done", task: node, title: node.title, revision: list.revision });
    else run({ kind: "status", id: node.id, status });
  }
  const filtering = !!search.trim() || filter !== "all";
  const matches = (node: TaskNode) =>
    (!search.trim() ||
      `${node.number} ${node.title}`.toLowerCase().includes(search.trim().toLowerCase())) &&
    (filter === "all" || node.status === filter);
  const containsMatch = (node: TaskNode): boolean =>
    matches(node) || node.children.some(containsMatch);
  const visible: TaskNode[] = [];
  const walk = (nodes: TaskNode[]) => {
    for (const node of nodes) {
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
          "message error text-[13px]! rounded-[8px] p-3 text-ink! m-0 bg-[#4e3030] [color:#ffe4dd]!"
        }
        role="alert"
      >
        {t(error)}
      </p>
      {conflict && editor?.task && (
        <p className={"mb-[1em] mt-[0]"}>
          {t("Latest task title:")}{" "}
          {list.tasks.find((task) => task.id === editor.task?.id)?.title ??
            t("Task no longer exists.")}
        </p>
      )}
      {conflict && (editor || imports.length > 0) && (
        <Button
          type="button"
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
          }
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
            setImportRevision(list.revision);
            setError("");
            setConflict(false);
          }}
        >
          {t("Use latest list and keep my draft")}
        </Button>
      )}
    </div>
  );
  const selectedImport = imports[selected];
  function importCount(tasks: LockInProject["tasks"]): number {
    return tasks.reduce((sum, task) => sum + 1 + importCount(task.subtasks), 0);
  }
  return (
    <Panel className={"task-list max-[700px]:p-4"} aria-label={t("Project to-do list")}>
      <div
        className={
          "task-list-heading flex justify-between items-center gap-4 mb-4 max-[700px]:flex-wrap"
        }
      >
        <div>
          <h2
            className={
              "font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 m-0"
            }
          >
            {t("To-do")}
          </h2>
          <small className={"text-muted text-[11px]"}>
            {completed}/{list.tasks.length} {t("tasks done")}
          </small>
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={() => open({ kind: "add", title: "", revision: list.revision })}
        >
          {t("Add task")}
        </Button>
      </div>
      <div
        className={
          "task-toolbar grid grid-cols-[minmax(0,_1fr)_160px] gap-3 mb-3 max-[700px]:grid-cols-[minmax(0,_1fr)]"
        }
      >
        <label className={"grid gap-[6px] text-[11px] text-muted"}>
          {t("Find a task")}
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Title or task number")}
            className={
              "w-full min-w-0 bg-bg text-ink border border-line rounded-[6px] font-mono py-2 px-2.5 min-h-9 pointer-coarse:min-h-11"
            }
          />
        </label>
        <label className={"grid gap-[6px] text-[11px] text-muted"}>
          {t("Task status")}
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={
              "w-full min-w-0 bg-bg text-ink border border-line rounded-[6px] font-mono py-2 px-2.5 min-h-9 pointer-coarse:min-h-11"
            }
          >
            <option value="all">{t("All statuses")}</option>
            {Object.entries(taskStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div
        className={
          "task-tools flex flex-wrap gap-1.5 mb-4 max-[700px]:grid max-[700px]:grid-cols-[repeat(2,_minmax(0,_1fr))]"
        }
      >
        <Button
          type="button"
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] max-[700px]:py-2.25 max-[700px]:px-1.75 max-[700px]:text-[11px]"
          }
          disabled={pending || !list.tasks.length}
          onClick={() =>
            run({ kind: "collapse", ids: list.tasks.map((t) => t.id), collapsed: false })
          }
        >
          {t("Expand all")}
        </Button>
        <Button
          type="button"
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] max-[700px]:py-2.25 max-[700px]:px-1.75 max-[700px]:text-[11px]"
          }
          disabled={pending || !list.tasks.length}
          onClick={() =>
            run({ kind: "collapse", ids: list.tasks.map((t) => t.id), collapsed: true })
          }
        >
          {t("Collapse all")}
        </Button>
        <Button
          type="button"
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] max-[700px]:py-2.25 max-[700px]:px-1.75 max-[700px]:text-[11px]"
          }
          disabled={pending}
          onClick={(event) => {
            opener.current = event.currentTarget;
            file.current?.click();
          }}
        >
          {t("Import Lock-In")}
        </Button>
        <Button
          type="button"
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] max-[700px]:py-2.25 max-[700px]:px-1.75 max-[700px]:text-[11px]"
          }
          disabled={pending}
          onClick={download}
        >
          {t("Export Lock-In")}
        </Button>
        <Input
          ref={file}
          className={
            "sr-only absolute w-0.25 h-0.25 p-0 -m-0.25 overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0"
          }
          type="file"
          accept=".json,application/json"
          aria-label={t("Lock-In JSON file")}
          onChange={readFile}
        />
      </div>
      {!editor && !imports.length && errorBox}
      {notice && (
        <p
          className={
            "message text-[13px]! bg-[#30422d] rounded-[8px] p-3 text-ink! m-0 [&.error]:bg-[#4e3030] [&.error]:[color:#ffe4dd]!"
          }
          role="status"
        >
          {t(notice)}
        </p>
      )}
      {!list.tasks.length ? (
        <p className={"muted mb-[1em] mt-[0] text-muted text-[12px]"}>
          {t("No tasks yet. Add a task or import a Lock-In project.")}
        </p>
      ) : !visible.length ? (
        <p className={"muted mb-[1em] mt-[0] text-muted text-[12px]"}>{t("No matching tasks.")}</p>
      ) : (
        <ol className={"task-tree list-none p-0 m-0"}>
          {visible.map((node) => (
            <li
              key={node.id}
              className={[
                `task-row task-${node.status}`,
                node.status === "done" && "[&_.task-title]:text-muted [&_.task-title]:line-through",
                node.status === "in_progress" && "[&_.task-title]:text-lime",
                "flex flex-wrap items-center justify-between gap-[6px_12px] py-2.25 px-0 border-b border-b-line min-w-[0]",
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
                    className={[
                      "task-expand",
                      "text-ink bg-transparent p-0 rounded-[4px] min-h-8 text-[13px] text-left [flex:0_0_26px] pointer-coarse:min-h-11 pointer-coarse:min-w-11",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={pending}
                    aria-label={t(node.collapsed ? "Expand subtasks" : "Collapse subtasks")}
                    aria-expanded={node.children.length ? filtering || !node.collapsed : undefined}
                    onClick={() =>
                      run({ kind: "collapse", ids: [node.id], collapsed: !node.collapsed })
                    }
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
                <span
                  className={"task-number text-lime text-[11px] wrap-anywhere max-w-[5em] shrink-0"}
                >
                  {node.number}
                </span>
                <Button
                  type="button"
                  className={[
                    "task-title",
                    "text-ink bg-transparent p-1 rounded-[4px] min-h-8 text-[13px] text-left block wrap-anywhere min-w-0 [&:hover]:bg-line [&:hover]:[transform:none]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={pending}
                  onClick={() =>
                    open({ kind: "edit", task: node, title: node.title, revision: list.revision })
                  }
                >
                  {node.title}
                </Button>
              </div>
              <div
                className={
                  "task-row-controls flex items-center gap-1.5 shrink-0 ml-[auto] max-[700px]:ml-0 max-[700px]:flex-wrap"
                }
              >
                <Select
                  aria-label={`${t("Task status")} ${node.number}`}
                  disabled={pending}
                  value={node.status}
                  onChange={(e) => mark(node, e.target.value as TaskStatus)}
                  className={
                    "w-32.5 min-h-9 py-2 px-2.5 text-[11px] bg-bg text-ink border border-line rounded-[6px] font-mono pointer-coarse:min-h-11"
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
                    "button secondary task-icon rounded-[9px] inline-flex items-center justify-center gap-3 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] w-8 h-8 min-h-8 p-0 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                  }
                  title={t("Add subtask")}
                  aria-label={`${t("Add subtask")} ${node.number}`}
                  disabled={pending}
                  onClick={() =>
                    open({ kind: "add", parentId: node.id, title: "", revision: list.revision })
                  }
                >
                  <Icon name="plus" />
                </Button>
                <Button
                  type="button"
                  className={
                    "button secondary task-icon rounded-[9px] inline-flex items-center justify-center gap-3 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] w-8 h-8 min-h-8 p-0 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                  }
                  title={t("Delete task")}
                  aria-label={`${t("Delete task")} ${node.number}`}
                  disabled={pending}
                  onClick={() =>
                    open({ kind: "delete", task: node, title: node.title, revision: list.revision })
                  }
                >
                  <Icon name="delete" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {editor && (
        <Dialog
          open
          onClose={close}
          dismissible={!pending}
          className={
            "task-dialog [&_select]:w-full [&_select]:min-w-0 [&_select]:bg-bg [&_select]:text-ink [&_select]:border [&_select]:border-line [&_select]:rounded-[6px] [&_select]:font-mono [&_select]:py-2 [&_select]:px-2.5 [&_select]:min-h-9 w-[min(580px,_calc(100vw_-_32px))] max-h-[calc(100dvh_-_48px)] overflow-y-auto p-6 border border-line rounded-[12px] bg-bg text-ink backdrop:[background:#000a] [&_.task-feedback]:mt-3"
          }
          labelledBy="task-editor-heading"
        >
          <form
            className={
              "form-stack flex flex-col gap-3 [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[#4b6056] [&_textarea]:bg-[#101c1b] [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_select]:bg-[#101c1b] [&_select]:text-ink [&_select]:border [&_select]:border-[#4b6056] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:[outline:3px_solid_var(--color-lime)] [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
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
                "font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 m-0"
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
              <label className={"grid gap-[6px] text-[13px] text-ink"}>
                {t("Task title")}
                <Input
                  autoFocus
                  required
                  maxLength={300}
                  disabled={pending}
                  value={editor.title}
                  onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                  className={
                    "min-w-0 font-mono min-h-9 w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                  }
                />
              </label>
            ) : (
              <>
                <p className={"preserve-lines mb-[1em] mt-[0] whitespace-pre-wrap wrap-anywhere"}>
                  {editor.task.number} · {editor.title}
                </p>
                <p className={"mb-[1em] mt-[0]"}>
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
            <div className={"task-dialog-actions flex flex-wrap gap-[8px] mt-[16px]"}>
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
                className={
                  "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] mt-2 lg:compact:mt-1"
                }
                disabled={pending}
                onClick={close}
              >
                {t("Cancel")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {selectedImport && (
        <Dialog
          open
          onClose={close}
          dismissible={!pending}
          className={
            "task-dialog [&_input]:w-full [&_input]:min-w-0 [&_input]:bg-bg [&_input]:text-ink [&_input]:border [&_input]:border-line [&_input]:rounded-[6px] [&_input]:font-mono [&_input]:py-2 [&_input]:px-2.5 [&_input]:min-h-9 w-[min(580px,_calc(100vw_-_32px))] max-h-[calc(100dvh_-_48px)] overflow-y-auto p-6 border border-line rounded-[12px] bg-bg text-ink backdrop:[background:#000a] [&_.task-feedback]:mt-3"
          }
          labelledBy="task-import-heading"
        >
          <h2
            id="task-import-heading"
            className={
              "font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 m-0"
            }
          >
            {t("Import Lock-In")}
          </h2>
          <label className={"grid gap-[6px] text-[11px] text-muted"}>
            {t("Source project")}
            <Select
              value={selected}
              disabled={pending}
              onChange={(e) => setSelected(Number(e.target.value))}
              className={
                "w-[100%] min-w-[0] bg-bg text-ink border border-line rounded-[6px] font-mono py-2 px-2.5 min-h-[36px]"
              }
            >
              {imports.map((p, i) => (
                <option key={p.id} value={i}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>
          <p className={"mb-[1em] mt-[0]"}>
            {importCount(selectedImport.tasks)} {t("tasks to add")}
          </p>
          <p className={"muted mb-[1em] mt-[0] text-muted text-[12px]"}>
            {t(
              "This adds tasks to the current project. Existing tasks and project details stay as they are. Source IDs are remapped; this is not a sync.",
            )}
          </p>
          <ol
            className={
              "task-import-preview my-[1em] max-h-[260px] overflow-auto list-none p-3 bg-panel rounded-[8px] text-[11px]"
            }
          >
            {(function preview(
              tasks: LockInProject["tasks"],
              prefix = "",
              depth = 0,
            ): React.ReactNode {
              return tasks.map((task, i) => {
                const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
                return (
                  <li
                    key={task.id}
                    style={{ marginLeft: Math.min(depth, 4) * 12 }}
                    className={"py-1 px-0 wrap-anywhere"}
                  >
                    <span>
                      {number} · {task.title} · {t(taskStatusLabels[task.status])}
                    </span>
                    {task.subtasks.length > 0 && (
                      <ol className={"my-[1em] list-none p-0"}>
                        {preview(task.subtasks, number, depth + 1)}
                      </ol>
                    )}
                  </li>
                );
              });
            })(selectedImport.tasks)}
          </ol>
          {errorBox}
          <div className={"task-dialog-actions flex flex-wrap gap-[8px] mt-[16px]"}>
            <Button
              type="button"
              disabled={pending || conflict || !importCount(selectedImport.tasks)}
              onClick={() =>
                startTransition(async () => {
                  try {
                    apply(await importTasks(projectId, importRevision, selectedImport), true);
                  } catch {
                    setError("Could not save tasks. Your draft is still here.");
                  }
                })
              }
            >
              {t("Add imported tasks")}
            </Button>
            <Button
              type="button"
              className={
                "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
              }
              disabled={pending}
              onClick={close}
            >
              {t("Cancel")}
            </Button>
          </div>
        </Dialog>
      )}
    </Panel>
  );
}
