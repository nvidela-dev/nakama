"use client";
import { useState } from "react";
import { FormStack } from "@/shared/ui/workspace-layout";
import { Input } from "@/shared/ui/controls";
import { Dialog } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import type { TaskOperation } from "@/features/tasks/input";
import { descendants } from "@/features/tasks/model";
import { useT } from "@/shared/i18n/provider";
import type { Editor } from "../model";

export function TaskActionDialog({
  close,
  pending,
  editor,
  run,
  errorBox,
  conflict,
}: {
  close: () => void;
  pending: boolean;
  editor: Editor;
  run: (operation: TaskOperation, revision?: number, closeAfter?: boolean) => Promise<boolean>;
  errorBox: React.ReactNode;
  conflict: boolean;
}) {
  const t = useT();
  const [title, setTitle] = useState(editor.title);
  return (
    <Dialog
      open
      onClose={close}
      dismissible={!pending}
      className={
        "task-dialog [&_select]:w-full w-[min(580px,_calc(100vw_-_32px))] max-h-[calc(100dvh_-_48px)] overflow-y-auto p-6 border border-line rounded-[12px] bg-bg text-ink backdrop:[background:#000a] [&_.task-feedback]:mt-3"
      }
      labelledBy="task-editor-heading"
    >
      <FormStack
        onSubmit={(event) => {
          event.preventDefault();
          if (editor.kind === "add")
            run({ kind: "add", title, parentId: editor.parentId ?? null }, editor.revision, true);
          else if (editor.kind === "edit")
            run({ kind: "edit", id: editor.task.id, title }, editor.revision, true);
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
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={"min-w-0 min-h-9 w-full [resize:vertical]"}
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
            <Button type="submit" disabled={pending || conflict} className={"mt-2 lg:compact:mt-1"}>
              {t(pending ? "Saving…" : editor.kind === "delete" ? "Confirm deletion" : "Save task")}
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
      </FormStack>
    </Dialog>
  );
}
