"use client";
import { FormStack } from "@/shared/ui/workspace-layout";
import { Panel } from "@/shared/ui/panel";
import { Input, Select } from "@/shared/ui/controls";
import { Button } from "@/shared/ui/button";
import { type ArtifactDetail, type ArtifactTask } from "@/features/artifacts/model";
import { useT } from "@/shared/i18n/provider";
import type { Dispatch, SetStateAction } from "react";

export function ArtifactTaskListForm({
  artifact,
  run,
  tasks,
  patchTask,
  setTasks,
  pending,
}: {
  artifact: ArtifactDetail;
  run: (operation: "tasks", input: ArtifactTask[]) => void;
  tasks: ArtifactTask[];
  patchTask: (id: string, patch: Partial<ArtifactTask>) => void;
  setTasks: Dispatch<SetStateAction<ArtifactTask[]>>;
  pending: boolean;
}) {
  const t = useT();
  return (
    <Panel className={"artifact-tasks"} aria-label={t("Artifact to-do list")}>
      <div
        className={
          "artifact-library-heading flex items-center justify-between flex-wrap gap-3.5 mb-4.5 [&_p]:mt-1.5 [&_p]:mx-0 [&_p]:mb-0 [&_p]:text-[12px] [&_p]:max-w-[60ch] max-[700px]:items-start max-[700px]:[&_>_button]:w-full"
        }
      >
        <h2
          className={
            "font-sans tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 text-[17px] m-0"
          }
        >
          {t("To-do")}
        </h2>
        <small>
          {artifact.tasks.filter((task) => task.status === "done").length}/{artifact.tasks.length}
        </small>
      </div>
      <FormStack
        className="[&_label]:text-[13px] [&_label]:text-ink"
        onSubmit={(e) => {
          e.preventDefault();
          run("tasks", tasks);
        }}
      >
        {tasks.map((task, index) => (
          <div key={task.id} className={"artifact-task grid gap-1.75 pb-3 border-b border-b-line"}>
            <Input
              required
              maxLength={300}
              aria-label={`${t("Task title")} ${index + 1}`}
              value={task.title}
              onChange={(e) => patchTask(task.id, { title: e.target.value })}
              className={"min-w-0 w-full [resize:vertical]"}
            />
            <div className={"flex items-center gap-2.5"}>
              <Select
                aria-label={`${t("Task status")} ${index + 1}`}
                value={task.status}
                onChange={(e) =>
                  patchTask(task.id, { status: e.target.value as ArtifactTask["status"] })
                }
                className={"max-w-full min-w-0 flex-1 focus-visible:[outline-offset:4px]"}
              >
                <option value="ready">{t("Ready")}</option>
                <option value="in_progress">{t("In progress")}</option>
                <option value="done">{t("Done")}</option>
              </Select>
              <Button
                type="button"
                variant="ghost"
                className={
                  "min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] mt-2 lg:compact:mt-1"
                }
                aria-label={`${t("Remove task")} ${index + 1}`}
                onClick={() => setTasks((items) => items.filter((item) => item.id !== task.id))}
              >
                {t("Remove")}
              </Button>
            </div>
          </div>
        ))}
        {!tasks.length && (
          <p className={"muted mb-[1em] mt-0 text-muted text-[11px]"}>{t("No tasks yet.")}</p>
        )}
        <Button
          type="button"
          className={"button secondary mt-2 lg:compact:mt-1"}
          disabled={tasks.length >= 100 || pending}
          onClick={() =>
            setTasks((items) => [...items, { id: crypto.randomUUID(), title: "", status: "ready" }])
          }
          variant="secondary"
        >
          {t("Add task")}
        </Button>
        <Button type="submit" pending={pending} className={"mt-2 lg:compact:mt-1"}>
          {t("Save tasks")}
        </Button>
      </FormStack>
    </Panel>
  );
}
