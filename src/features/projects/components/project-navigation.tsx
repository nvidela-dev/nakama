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
    <div className={"project-navigation relative flex items-center gap-[3px]"} ref={root}>
      <Link href="/projects">{t("Your projects")}</Link>
      <Button
        type="submit"
        ref={trigger}
        className={
          'project-navigation-trigger inline-flex min-w-6 min-h-7 p-1 border-0 rounded-[4px] bg-transparent text-ink hover:[background:transparent] hover:text-lime [&[aria-expanded="true"]_svg]:[transform:rotate(180deg)] focus-visible:[outline:2px_solid_var(--color-lime)] focus-visible:[outline-offset:2px] pointer-coarse:min-w-11 pointer-coarse:min-h-11'
        }
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
          className={
            "project-navigation-panel absolute z-[50] top-[calc(100%_+_12px)] right-0 w-[min(300px,_calc(100vw_-_32px))] h-80 max-h-[calc(100dvh_-_140px)] overflow-y-auto [overscroll-behavior:contain] p-2 [box-shadow:0_12px_36px_#0008] [&_li_+_li]:border-t [&_li_+_li]:border-t-line max-[700px]:fixed max-[700px]:top-25 max-[700px]:right-4"
          }
          aria-label={t("Your projects")}
        >
          {error ? (
            <p role="alert" className={"m-3"}>
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
            <ul className={"list-none m-0 p-0"}>
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    aria-current={path === `/projects/${project.id}` ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={
                      '[&:hover]:bg-[#2b4030] [&:hover]:text-lime [&[aria-current="page"]]:bg-[#2b4030] [&[aria-current="page"]]:text-lime [&:focus-visible]:[outline:2px_solid_var(--color-lime)] [&:focus-visible]:[outline-offset:-2px]'
                    }
                  >
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={"m-3"}>{t("No projects yet.")}</p>
          )}
        </Panel>
      )}
    </div>
  );
}
