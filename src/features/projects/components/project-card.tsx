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
    <article
      className={[
        `project-card ${project.role === "owner" ? "has-management" : ""}`,
        "block py-3.5 px-4 border border-line rounded-[9px] mb-2 [background:linear-gradient(120deg,_var(--theme-surface,#21342c),_var(--color-panel))] relative hover:[border-color:var(--theme-border,#9cba7b)] [&_.eyebrow]:flex [&_.eyebrow]:justify-between [&_p]:text-[14px] [&_p]:text-muted [&_p]:whitespace-pre-wrap [&_p]:wrap-anywhere [&_small]:text-muted [&_small]:text-[12px] lg:compact:py-3 lg:compact:px-4 lg:compact:rounded-[8px] lg:compact:[&_p]:text-[13px] lg:compact:[&_p]:mt-1.25 lg:compact:[&_p]:mx-0 lg:compact:[&_p]:mb-1.75 lg:compact:[&_p]:leading-[1.45] lg:compact:[&_small]:text-[11px]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Link className={"project-card-link block"} href={`/projects/${project.id}`}>
        <h3
          className={[
            "font-mono tracking-[-0.045em] font-semibold m-0 pt-1 px-0.5 pb-0.5 text-[16px] leading-[1.35] wrap-anywhere lg:compact:text-[15px]",
            project.role === "owner" && "pr-8 pointer-coarse:pr-11",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {project.name}
        </h3>
        {children}
      </Link>
      {project.role === "owner" && (
        <>
          <div className="project-card-actions absolute top-1.5 right-1.5 [&_.ui-action-menu-items]:z-20">
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
            className={
              "project-management-dialog w-[min(640px,_calc(100vw_-_28px))] max-h-[calc(100dvh_-_40px)] p-5 border border-line rounded-[12px] bg-bg text-ink overflow-y-auto backdrop:[background:#0009] [&_.project-settings]:m-0"
            }
            label={`${t(mode === "edit" ? "Edit project" : "Delete project")} · ${project.name}`}
          >
            <div className={"project-dialog-heading flex justify-between items-center gap-3 mb-3"}>
              <strong className={"wrap-anywhere"}>{project.name}</strong>
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t("Close")}
                className={"shrink-0 p-0 w-11 min-h-11 bg-panel text-ink"}
              >
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
