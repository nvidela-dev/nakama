import { Panel } from "@/shared/ui/panel";
import { WaveMark } from "@/shared/ui/wave-mark";
import { requestPolicy } from "@/features/access/server/request-store";
import { AccessRequestList } from "@/features/access/components/access-request-list";
import { getT } from "@/shared/i18n/server";
import { ProjectCard } from "@/features/projects/components/project-card";
import { WhitelistList } from "@/features/access/components/whitelist-list";
import { AddAllowedEmail } from "@/features/access/components/whitelist";
import { isAppAdmin } from "@/features/access/server/app-access";
import { accessPolicy, adminEmail } from "@/features/access/server/whitelist";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { projectService } from "@/features/projects/server/projects";
import { projectProgress } from "@/features/projects/server/project-progress";
import { ProjectTimeline } from "@/features/projects/components/project-timeline";
import { NewProjectButton } from "@/features/projects/components/new-project";
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
              <span aria-hidden="true">
                <WaveMark />
              </span>
              <h3>{t("No projects yet")}</h3>
              <p>{t("Create a project to get started.")}</p>
            </div>
          )}
        </section>
        <aside className="main-screen-sidebar">
          <NewProjectButton />
          {allowed && (
            <Panel className="main-whitelist">
              <h2>{t("Allow a person")}</h2>
              <AddAllowedEmail />
              <details>
                <summary>
                  {t("Allowed emails")} <span className="count">{allowed.length}</span>
                </summary>
                <p className="muted">
                  {t(
                    "Removing access blocks future private requests. It does not delete the account or project history.",
                  )}
                </p>
                <WhitelistList entries={allowed} />
              </details>
              {requests && (
                <details>
                  <summary>
                    {t("Access requests")} <span className="count">{requests.length}</span>
                  </summary>
                  <AccessRequestList requests={requests} />
                </details>
              )}
            </Panel>
          )}
        </aside>
      </div>
    </main>
  );
}
