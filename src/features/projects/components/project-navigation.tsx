"use client";
import { Icon } from "@/shared/ui/icon";
import { Panel } from "@/shared/ui/panel";

import { Button } from "@/shared/ui/button";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationProjects } from "@/features/projects/navigation-actions";
import { LoadingState } from "@/shared/ui/loading-state";
import { useT } from "@/shared/i18n/provider";

export function ProjectNavigation() {
  const path = usePathname();
  return <ProjectNavigationMenu key={path} />;
}
function ProjectNavigationMenu() {
  const t = useT(),
    path = usePathname();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof navigationProjects>>>();
  const [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void navigationProjects()
      .then((items) => {
        if (!cancelled) setProjects(items);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, attempt]);
  return (
    <div className="project-navigation" ref={root}>
      <Link href="/projects">{t("Your projects")}</Link>
      <Button
        type="submit"
        ref={trigger}
        className="project-navigation-trigger"
        aria-label={t("Open project list")}
        aria-expanded={open}
        aria-controls="header-project-list"
        onClick={() => {
          if (!open) {
            setProjects(undefined);
            setError(false);
          }
          setOpen(!open);
        }}
      >
        <Icon name="chevronDown" />
      </Button>
      {open && (
        <Panel
          id="header-project-list"
          className="project-navigation-panel"
          aria-label={t("Your projects")}
        >
          {error ? (
            <p role="alert">
              {t("Could not load projects.")}{" "}
              <Button
                type="submit"
                onClick={() => {
                  setProjects(undefined);
                  setError(false);
                  setAttempt((value) => value + 1);
                }}
              >
                {t("Retry")}
              </Button>
            </p>
          ) : !projects ? (
            <LoadingState label={t("Loading…")} variant="compact" lines={3} />
          ) : projects.length ? (
            <ul>
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    aria-current={path === `/projects/${project.id}` ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("No projects yet.")}</p>
          )}
        </Panel>
      )}
    </div>
  );
}
