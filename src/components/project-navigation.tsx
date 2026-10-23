"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationProjects } from "@/app/project-navigation-actions";
import { useT } from "./language";

export function ProjectNavigation() {
  const t = useT(), path = usePathname();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof navigationProjects>>>();
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setProjects(undefined);
    setError(false);
    void navigationProjects().then(items => { if (!cancelled) setProjects(items); })
      .catch(() => { if (!cancelled) setError(true); });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, attempt]);
  return <div className="project-navigation" ref={root}>
    <Link href="/projects">{t("Your projects")}</Link>
    <button ref={trigger} className="project-navigation-trigger" aria-label={t("Open project list")}
      aria-expanded={open} aria-controls="header-project-list" onClick={() => { if (!open) { setProjects(undefined); setError(false); } setOpen(!open); }}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    {open && <section id="header-project-list" className="project-navigation-panel panel" aria-label={t("Your projects")}>
      {error ? <p role="alert">{t("Could not load projects.")} <button onClick={() => setAttempt(value => value + 1)}>{t("Retry")}</button></p>
        : !projects ? <p role="status">{t("Loading…")}</p>
        : projects.length ? <ul>{projects.map(project => <li key={project.id}>
          <Link href={`/projects/${project.id}`} aria-current={path === `/projects/${project.id}` ? "page" : undefined} onClick={() => setOpen(false)}>{project.name}</Link>
        </li>)}</ul> : <p>{t("No projects yet.")}</p>}
    </section>}
  </div>;
}
