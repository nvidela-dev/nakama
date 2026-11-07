"use client";
import { Input, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState, useState } from "react";
import { editProject, deleteProject } from "@/features/projects/actions";
import { useT } from "@/shared/i18n/provider";
import { ActionMenu } from "@/shared/ui/action-menu";
import { Feedback } from "@/shared/ui/feedback";

export function ProjectSettings({
  projectId,
  name,
  description,
  contentRevision,
  initialMode,
}: {
  projectId: string;
  name: string;
  description: string;
  contentRevision: number;
  initialMode?: "edit" | "delete";
}) {
  const t = useT();
  const [editing, setEditing] = useState(initialMode === "edit");
  const [confirming, setConfirming] = useState(initialMode === "delete");
  const [confirmation, setConfirmation] = useState("");
  const [editState, save, saving] = useActionState(
    editProject.bind(null, projectId, { name, description, contentRevision }),
    {},
  );
  const [deleteState, remove, deleting] = useActionState(deleteProject.bind(null, projectId), {});
  const prefix = `settings-${projectId}`;
  return (
    <section data-action-scope className={"project-settings mb-4.5 [&_[hidden]]:hidden"}>
      {!initialMode && (
        <ActionMenu label={t("Project actions")}>
          <Button
            type="button"
            className={"button secondary"}
            aria-expanded={editing}
            aria-controls={`${prefix}-edit-project-form`}
            onClick={() => setEditing(!editing)}
            variant="secondary"
          >
            {t("Edit project")}
          </Button>
          <Button
            type="button"
            className={"button secondary"}
            aria-expanded={confirming}
            aria-controls={`${prefix}-delete-project-form`}
            onClick={() => setConfirming(!confirming)}
            variant="secondary"
          >
            {t("Delete project")}
          </Button>
        </ActionMenu>
      )}
      <form
        id={`${prefix}-edit-project-form`}
        className={
          "form-stack panel p-7.5 bg-panel border border-line rounded-[16px] min-w-0 [&_p]:text-muted [&_h3]:mt-7 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5 flex flex-col gap-3 [&_select]:max-w-full lg:compact:gap-1.75 max-w-160 mt-3"
        }
        action={save}
        hidden={!editing}
      >
        <h2
          className={
            "mb-[0.83em] mt-0 font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
          }
        >
          {t("Edit project")}
        </h2>
        <label htmlFor={`${prefix}-edit-project-name`} className={"text-[13px] text-ink"}>
          {t("Project name")}
        </label>
        <Input
          id={`${prefix}-edit-project-name`}
          name="name"
          defaultValue={name}
          required
          maxLength={100}
          className={"w-full [resize:vertical]"}
        />
        <label htmlFor={`${prefix}-edit-project-description`} className={"text-[13px] text-ink"}>
          {t("Description")}
        </label>
        <Textarea
          id={`${prefix}-edit-project-description`}
          name="description"
          defaultValue={description}
          required
          maxLength={2000}
          rows={3}
          className={"min-h-30 w-full [resize:vertical] lg:compact:min-h-22.5"}
        />
        <small className={"text-[11px] text-muted"}>
          {t(
            "Changes also update the saved name and description answers, preserving their history.",
          )}
        </small>
        <Feedback state={editState} />
        <Button type="submit" disabled={saving} className={"mt-2 lg:compact:mt-1"}>
          {saving ? t("Saving…") : t("Save changes")}
        </Button>
      </form>
      <form
        id={`${prefix}-delete-project-form`}
        className={
          "form-stack panel p-7.5 bg-panel border border-line rounded-[16px] min-w-0 [&_h3]:mt-7 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5 flex flex-col gap-3 [&_textarea]:w-full [&_small]:text-[11px] [&_small]:text-muted [&_select]:max-w-full lg:compact:gap-1.75 max-w-160 mt-3"
        }
        action={remove}
        hidden={!confirming}
      >
        <h2
          className={
            "mb-[0.83em] mt-0 font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
          }
        >
          {t("Delete project")}
        </h2>
        <p className={"mb-[1em] mt-0 text-muted"}>
          {t(
            "Permanently delete this project for all members, including answers, revision history, and invitations. This cannot be undone.",
          )}
        </p>
        <label htmlFor={`${prefix}-delete-project-confirmation`} className={"text-[13px] text-ink"}>
          {t("Type the project name to confirm:")} <strong>{name}</strong>
        </label>
        <Input
          id={`${prefix}-delete-project-confirmation`}
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          required
          className={"w-full [resize:vertical]"}
        />
        <Feedback state={deleteState} />
        <Button
          type="submit"
          disabled={deleting || confirmation !== name}
          className={"mt-2 lg:compact:mt-1"}
        >
          {deleting ? t("Deleting…") : t("Permanently delete project")}
        </Button>
      </form>
    </section>
  );
}
