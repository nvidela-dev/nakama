"use client";
import { Icon } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";

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
        "block py-2.5 px-3.5 border border-line rounded-[9px] mb-2 [background:linear-gradient(120deg,_#21342c,_#182725)] relative hover:[border-color:#9cba7b] [&_.eyebrow]:flex [&_.eyebrow]:justify-between [&_p]:text-[14px] [&_p]:text-muted [&_p]:whitespace-pre-wrap [&_p]:wrap-anywhere [&_small]:text-muted [&_small]:text-[12px] lg:compact:py-2 lg:compact:px-3 lg:compact:rounded-[8px] lg:compact:[&_p]:text-[13px] lg:compact:[&_p]:mt-1.25 lg:compact:[&_p]:mx-0 lg:compact:[&_p]:mb-1.75 lg:compact:[&_p]:leading-[1.45] lg:compact:[&_small]:text-[11px] [&.has-management_h3]:pr-15 pointer-coarse:[&.has-management_h3]:pr-23",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Link className={"project-card-link block"} href={`/projects/${project.id}`}>
        <h3
          className={
            "font-mono tracking-[-0.045em] font-semibold m-0 text-[15px] leading-[1.2] wrap-anywhere lg:compact:text-[13.5px]"
          }
        >
          {project.name}
        </h3>
        {children}
      </Link>
      {project.role === "owner" && (
        <>
          <div className={"project-card-actions absolute top-[5px] right-[6px] flex gap-[2px]"}>
            <Button
              type="button"
              title={t("Edit project")}
              aria-label={t("Edit project")}
              onClick={() => open("edit")}
              className={
                "p-0 w-6.5 min-h-6.5 bg-transparent text-muted text-[14px] pointer-coarse:w-11 pointer-coarse:min-h-11 [&:hover]:bg-line [&:hover]:text-lime"
              }
            >
              <Icon name="edit" />
            </Button>
            <Button
              type="button"
              title={t("Delete project")}
              aria-label={t("Delete project")}
              onClick={() => open("delete")}
              className={
                "p-0 w-6.5 min-h-6.5 bg-transparent text-muted text-[14px] pointer-coarse:w-11 pointer-coarse:min-h-11 [&:hover]:bg-line [&:hover]:text-lime"
              }
            >
              <Icon name="delete" />
            </Button>
          </div>
          <Dialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            className={
              "project-management-dialog w-[min(640px,_calc(100vw_-_28px))] max-h-[calc(100dvh_-_40px)] p-5 border border-line rounded-[12px] bg-bg text-ink overflow-y-auto backdrop:[background:#0009] [&_.project-settings]:m-0"
            }
            label={`${t(mode === "edit" ? "Edit project" : "Delete project")} · ${project.name}`}
          >
            <div
              className={
                "project-dialog-heading flex justify-between items-center gap-[12px] mb-[12px]"
              }
            >
              <strong className={"wrap-anywhere"}>{project.name}</strong>
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t("Close")}
                className={"shrink-0 p-0 w-[44px] min-h-[44px] bg-panel text-ink"}
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
