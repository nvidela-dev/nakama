import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { projectService } from "@/lib/projects";
import { projectProgress } from "@/lib/project-progress";
import { ProjectTimeline } from "@/components/project-timeline";
import { CaptureForm } from "@/components/forms";
export const dynamic = "force-dynamic";
export default async function ProjectsPage() {
  const t = await getT();
  const person = await actor();
  const [projects, progress] = await Promise.all([
    projectService(database()).list(person),
    projectProgress(database(), person),
  ]);
  return (
    <main id="main" className="workspace">
      <div className="page-heading">
        <h1 aria-label={t("Projects")}>
          {t("Projects")} <span className="count">{projects.length}</span>
        </h1>
      </div>
      <div className="workspace-columns">
        <section className="project-list">
          <h2 className="sr-only">{t("Your projects")}</h2>
          {projects.length ? (
            projects.map((p) => (
              <Link
                className="project-card"
                key={p.id}
                href={`/projects/${p.id}`}
              >
                <h3>{p.name}</h3>
                <ProjectTimeline stages={progress.get(p.id)} t={t} />
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">✳</span>
              <h3>{t("No projects yet")}</h3>
              <p>{t("Create a project to get started.")}</p>
            </div>
          )}
        </section>
        <aside className="panel capture">
          <h2>{t("New project")}</h2>
          <CaptureForm />
        </aside>
      </div>
    </main>
  );
}
