"use client";
import { useActionState, useState } from "react";
import { editProject, deleteProject } from "@/app/actions";
import { useT } from "./language";
import { Feedback } from "./forms";

export function ProjectSettings({ projectId, name, description, contentRevision, initialMode }: {
  projectId: string; name: string; description: string; contentRevision: number; initialMode?: "edit" | "delete";
}) {
  const t = useT();
  const [editing, setEditing] = useState(initialMode === "edit");
  const [confirming, setConfirming] = useState(initialMode === "delete");
  const [confirmation, setConfirmation] = useState("");
  const [editState, save, saving] = useActionState(editProject.bind(null, projectId, { name, description, contentRevision }), {});
  const [deleteState, remove, deleting] = useActionState(deleteProject.bind(null, projectId), {});
  const prefix = `settings-${projectId}`;
  return <section className="project-settings">
    {!initialMode && <div className="project-settings-buttons">
      <button type="button" className="button secondary" aria-expanded={editing} aria-controls={`${prefix}-edit-project-form`} onClick={() => setEditing(!editing)}>{t("Edit project")}</button>
      <button type="button" className="button secondary" aria-expanded={confirming} aria-controls={`${prefix}-delete-project-form`} onClick={() => setConfirming(!confirming)}>{t("Delete project")}</button>
    </div>}
    <form id={`${prefix}-edit-project-form`} className="form-stack panel" action={save} hidden={!editing}>
      <h2>{t("Edit project")}</h2>
      <label htmlFor={`${prefix}-edit-project-name`}>{t("Project name")}</label>
      <input id={`${prefix}-edit-project-name`} name="name" defaultValue={name} required maxLength={100} />
      <label htmlFor={`${prefix}-edit-project-description`}>{t("Description")}</label>
      <textarea id={`${prefix}-edit-project-description`} name="description" defaultValue={description} required maxLength={2000} rows={3} />
      <small>{t("Changes also update the saved name and description answers, preserving their history.")}</small>
      <Feedback state={editState} />
      <button disabled={saving}>{saving ? t("Saving…") : t("Save changes")}</button>
    </form>
    <form id={`${prefix}-delete-project-form`} className="form-stack panel" action={remove} hidden={!confirming}>
      <h2>{t("Delete project")}</h2>
      <p>{t("Permanently delete this project for all members, including answers, revision history, and invitations. This cannot be undone.")}</p>
      <label htmlFor={`${prefix}-delete-project-confirmation`}>{t("Type the project name to confirm:")} <strong>{name}</strong></label>
      <input id={`${prefix}-delete-project-confirmation`} name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" required />
      <Feedback state={deleteState} />
      <button disabled={deleting || confirmation !== name}>{deleting ? t("Deleting…") : t("Permanently delete project")}</button>
    </form>
  </section>;
}
