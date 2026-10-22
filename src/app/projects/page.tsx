import { WaveMark } from "@/components/wave-mark";
import { requestPolicy } from "@/lib/request-store";
import { AccessRequestList } from "@/components/access-request-list";
import { getT } from "@/lib/i18n/server";
import { ProjectCard } from "@/components/project-card";
import { WhitelistList } from "@/components/whitelist-list";
import { AddAllowedEmail } from "@/components/whitelist";
import { isAppAdmin } from "@/lib/app-access";
import { accessPolicy, adminEmail } from "@/lib/whitelist";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { projectService } from "@/lib/projects";
import { projectProgress } from "@/lib/project-progress";
import { ProjectTimeline } from "@/components/project-timeline";
import { CaptureForm } from "@/components/forms";
export const dynamic = "force-dynamic";
export default async function ProjectsPage() {
  const t = await getT();
  const person = await actor(true);
  const admin = isAppAdmin(person, adminEmail());
  const [projects, progress, allowed, requests] = await Promise.all([
    projectService(database()).list(person),
    projectProgress(database(), person),
    admin ? accessPolicy().list(person) : Promise.resolve(null),
    admin ? requestPolicy().list(person) : Promise.resolve(null),
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
              <ProjectCard key={p.id} project={p}>
                <ProjectTimeline stages={progress.get(p.id)} t={t} />
              </ProjectCard>
            ))
          ) : (
            <div className="empty-state">
              <span aria-hidden="true"><WaveMark /></span>
              <h3>{t("No projects yet")}</h3>
              <p>{t("Create a project to get started.")}</p>
            </div>
          )}
        </section>
        <aside className="main-screen-sidebar">
        <section className="panel capture">
          <h2>{t("New project")}</h2>
          <CaptureForm />
        </section>
        {allowed && <section className="panel main-whitelist">
          <h2>{t("Allow a person")}</h2>
          <AddAllowedEmail />
          <details>
            <summary>{t("Allowed emails")} <span className="count">{allowed.length}</span></summary>
            <p className="muted">{t("Removing access blocks future private requests. It does not delete the account or project history.")}</p>
            <WhitelistList entries={allowed} />
          </details>
          {requests && <details><summary>{t("Access requests")} <span className="count">{requests.length}</span></summary><AccessRequestList requests={requests} /></details>}
        </section>}
        </aside>
      </div>
    </main>
  );
}
