"use client";
import { Input, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState, useState } from "react";
import { editProject, deleteProject } from "@/features/projects/actions";
import { useT } from "@/shared/i18n/provider";
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
    <section className="project-settings">
      {!initialMode && (
        <div className="project-settings-buttons">
          <Button
            type="button"
            className="button secondary"
            aria-expanded={editing}
            aria-controls={`${prefix}-edit-project-form`}
            onClick={() => setEditing(!editing)}
          >
            {t("Edit project")}
          </Button>
          <Button
            type="button"
            className="button secondary"
            aria-expanded={confirming}
            aria-controls={`${prefix}-delete-project-form`}
            onClick={() => setConfirming(!confirming)}
          >
            {t("Delete project")}
          </Button>
        </div>
      )}
      <form
        id={`${prefix}-edit-project-form`}
        className="form-stack panel"
        action={save}
        hidden={!editing}
      >
        <h2>{t("Edit project")}</h2>
        <label htmlFor={`${prefix}-edit-project-name`}>{t("Project name")}</label>
        <Input
          id={`${prefix}-edit-project-name`}
          name="name"
          defaultValue={name}
          required
          maxLength={100}
        />
        <label htmlFor={`${prefix}-edit-project-description`}>{t("Description")}</label>
        <Textarea
          id={`${prefix}-edit-project-description`}
          name="description"
          defaultValue={description}
          required
          maxLength={2000}
          rows={3}
        />
        <small>
          {t(
            "Changes also update the saved name and description answers, preserving their history.",
          )}
        </small>
        <Feedback state={editState} />
        <Button type="submit" disabled={saving}>
          {saving ? t("Saving…") : t("Save changes")}
        </Button>
      </form>
      <form
        id={`${prefix}-delete-project-form`}
        className="form-stack panel"
        action={remove}
        hidden={!confirming}
      >
        <h2>{t("Delete project")}</h2>
        <p>
          {t(
            "Permanently delete this project for all members, including answers, revision history, and invitations. This cannot be undone.",
          )}
        </p>
        <label htmlFor={`${prefix}-delete-project-confirmation`}>
          {t("Type the project name to confirm:")} <strong>{name}</strong>
        </label>
        <Input
          id={`${prefix}-delete-project-confirmation`}
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          required
        />
        <Feedback state={deleteState} />
        <Button type="submit" disabled={deleting || confirmation !== name}>
          {deleting ? t("Deleting…") : t("Permanently delete project")}
        </Button>
      </form>
    </section>
  );
}
