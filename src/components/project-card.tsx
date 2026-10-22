"use client";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useT } from "./language";
import { ProjectSettings } from "./project-settings";

export function ProjectCard({ project, children }: {
  project: { id: string; name: string; description: string; role: string; content_revision: number };
  children: ReactNode;
}) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "delete">("edit");
  const [opening, setOpening] = useState(0);
  function open(next: "edit" | "delete") {
    setMode(next);
    setIsOpen(true);
    setOpening((value) => value + 1);
    dialog.current?.showModal();
  }
  return <article className={`project-card ${project.role === "owner" ? "has-management" : ""}`}>
    <Link className="project-card-link" href={`/projects/${project.id}`}>
      <h3>{project.name}</h3>
      {children}
    </Link>
    {project.role === "owner" && <>
      <div className="project-card-actions">
        <button type="button" title={t("Edit project")} aria-label={t("Edit project")} onClick={() => open("edit")}>✎</button>
        <button type="button" title={t("Delete project")} aria-label={t("Delete project")} onClick={() => open("delete")}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button>
      </div>
      <dialog onClose={() => setIsOpen(false)} ref={dialog} className="project-management-dialog" aria-label={`${t(mode === "edit" ? "Edit project" : "Delete project")} · ${project.name}`}>
        <div className="project-dialog-heading"><strong>{project.name}</strong><button type="button" onClick={() => dialog.current?.close()} aria-label={t("Close")}>×</button></div>
        {isOpen && <ProjectSettings key={opening} projectId={project.id} name={project.name} description={project.description} contentRevision={project.content_revision} initialMode={mode} />}
      </dialog>
    </>}
  </article>;
}
