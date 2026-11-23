"use client";
import { EmptyState, StatusMessage } from "@/shared/ui/panel";
import { FilterBar } from "@/shared/ui/form-patterns";
import { TaskActionDialog } from "./task-action-dialog";
import { TaskTreeRow } from "./task-tree-row";
import type { ArtifactChoice } from "@/features/artifacts/model";

import { Switch } from "@/shared/ui/switch";
import { BoardCard } from "./board-card";
import { TaskArtifacts } from "./task-artifacts";
import { MilestoneBoard } from "./milestone-board";
import type { FlowId } from "@/shared/contracts/database.generated";
import { Icon } from "@/shared/ui/icon";
import { Panel } from "@/shared/ui/panel";

import { Select } from "@/shared/ui/controls";

import { Button, ToolbarAction } from "@/shared/ui/button";

import { useMemo, useState, useTransition } from "react";
import { changeTask, type TaskResult } from "@/features/tasks/actions";
import type { TaskOperation } from "@/features/tasks/input";
import {
  taskTree,
  filterTaskTree,
  taskStatusLabels,
  type TaskNode,
  type TaskSnapshot,
  type TaskStatus,
} from "@/features/tasks/model";
import { useT } from "@/shared/i18n/provider";
import type { Editor } from "../model";
export function TaskList({
  projectId,
  initial,
  flowId = null,
  artifacts = [],
}: {
  projectId: string;
  initial: TaskSnapshot;
  flowId?: FlowId | null;
  artifacts?: ArtifactChoice[];
}) {
  const t = useT();
  const [list, setList] = useState(initial),
    [pending, startTransition] = useTransition();
  const [editor, setEditor] = useState<Editor | null>(null),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [notice, setNotice] = useState("");
  const [attachmentTask, setAttachmentTask] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [filter, setFilter] = useState("all");
  if (initial.revision > list.revision) setList(initial);
  const tree = useMemo(() => taskTree(list.tasks), [list.tasks]);
  const completed = useMemo(
    () => list.tasks.filter((task) => task.status === "done").length,
    [list.tasks],
  );
  function open(value: Editor) {
    setError("");
    setConflict(false);
    setEditor(value);
  }
  function close() {
    setEditor(null);
    setError("");
    setConflict(false);
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
  const visible = useMemo(() => filterTaskTree(tree, view, filter), [tree, view, filter]);
  const errorBox = error && (
    <div className="task-feedback">
      <StatusMessage tone="error">{t(error)}</StatusMessage>
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
      <TaskTreeRow
        key={node.id}
        node={node}
        pending={pending}
        filtering={filtering}
        run={run}
        open={open}
        revision={list.revision}
        mark={mark}
      />
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
          disabled={pending}
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
        className={"w-36 min-w-0 shrink-0 min-h-8 pointer-coarse:min-h-11"}
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
    <ToolbarAction
      label={t("Add task")}
      disabled={pending}
      onClick={() => open({ kind: "add", title: "", revision: list.revision })}
    >
      <Icon name="addTask" />
    </ToolbarAction>
  );
  const feedback = (
    <>
      {!editor && !attachmentTask && errorBox}
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
          renderTask={(node, move) => {
            const attached = list.attachments
              .filter((a) => a.task_id === node.id)
              .map((a) => a.artifact_id);
            return (
              <BoardCard
                projectId={projectId}
                node={node}
                pending={pending}
                parent={list.tasks.find((task) => task.id === node.parent_id)?.title}
                move={move}
                edit={() =>
                  open({ kind: "edit", task: node, title: node.title, revision: list.revision })
                }
                remove={() =>
                  open({ kind: "delete", task: node, title: node.title, revision: list.revision })
                }
                addChild={() =>
                  open({ kind: "add", parentId: node.id, title: "", revision: list.revision })
                }
                status={(value) => mark(node, value)}
                attachmentCount={attached.length}
                showAttachments={() => {
                  setError("");
                  setAttachmentTask(node.id);
                }}
              />
            );
          }}
          error={error}
          toolbar={controls}
          actions={addTaskButton}
          feedback={feedback}
        />
      ) : (
        <>
          <FilterBar className="task-toolbar mb-3">
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
          </FilterBar>
          {feedback}
          {!visible.length ? (
            <EmptyState title={t("No matching tasks.")} />
          ) : (
            <ol className="task-tree list-none p-0 m-0">{visible.map(renderTask)}</ol>
          )}
        </>
      )}
      {attachmentTask && (
        <TaskArtifacts
          key={attachmentTask}
          projectId={projectId}
          taskId={attachmentTask}
          items={artifacts}
          attached={list.attachments
            .filter((a) => a.task_id === attachmentTask)
            .map((a) => a.artifact_id)}
          run={run}
          pending={pending}
          operationError={error}
          onClose={() => {
            setError("");
            setAttachmentTask(null);
          }}
        />
      )}
      {editor && (
        <TaskActionDialog
          close={close}
          pending={pending}
          editor={editor}
          run={run}

          errorBox={errorBox}
          conflict={conflict}
        />
      )}
    </Panel>
  );
}
