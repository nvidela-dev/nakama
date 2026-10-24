"use client";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";
import { ActionMenu } from "@/shared/ui/action-menu";

import { useState, type ReactNode } from "react";
import { Dialog } from "@/shared/ui/dialog";
import Link from "next/link";
import { useT } from "@/shared/i18n/provider";
import { ProjectSettings } from "@/features/projects/components/project-settings";

export function ProjectCard({
  project,
  children,
}: {
  project: {
    id: string;
    name: string;
    description: string;
    role: string;
    content_revision: number;
  };
  children: ReactNode;
}) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "delete">("edit");
  const [opening, setOpening] = useState(0);
  function open(next: "edit" | "delete") {
    setMode(next);
    setIsOpen(true);
    setOpening((value) => value + 1);
  }
  return (
    <article className={`project-card ${project.role === "owner" ? "has-management" : ""}`}>
      <Link className="project-card-link" href={`/projects/${project.id}`}>
        <h3>{project.name}</h3>
        {children}
      </Link>
      {project.role === "owner" && (
        <>
          <div className="project-card-actions">
            <ActionMenu id={`project-actions-${project.id}`} label={t("Project actions")}>
              <Button type="button" variant="ghost" onClick={() => open("edit")}>
                <Icon name="edit" /> {t("Edit project")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => open("delete")}>
                <Icon name="delete" /> {t("Delete project")}
              </Button>
            </ActionMenu>
          </div>
          <Dialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            className="project-management-dialog"
            label={`${t(mode === "edit" ? "Edit project" : "Delete project")} · ${project.name}`}
          >
            <div className="project-dialog-heading">
              <strong>{project.name}</strong>
              <Button type="button" onClick={() => setIsOpen(false)} aria-label={t("Close")}>
                <Icon name="close" />
              </Button>
            </div>
            {isOpen && (
              <ProjectSettings
                key={opening}
                projectId={project.id}
                name={project.name}
                description={project.description}
                contentRevision={project.content_revision}
                initialMode={mode}
              />
            )}
          </Dialog>
        </>
      )}
    </article>
  );
}
