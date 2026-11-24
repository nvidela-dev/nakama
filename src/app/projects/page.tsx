import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectError } from "@/shared/contracts/errors";
import {
  ExplorationIndexHeading,
  explorationIndexSpacing,
} from "@/features/projects/components/exploration-index-heading";
import { Workspace } from "@/shared/ui/workspace-layout";
import { WaveMark } from "@/shared/ui/wave-mark";
import { getT } from "@/shared/i18n/server";
import { NewProjectButton } from "@/features/projects/components/new-project";
import { ProjectCard } from "@/features/projects/components/project-card";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { projectService } from "@/features/projects/server/projects";
import { groupProjectsByType } from "@/features/projects/group-by-type";
import {
  projectActivityCounts,
  projectProgress,
} from "@/features/projects/server/project-progress";
import { ProjectTimeline } from "@/features/projects/components/project-timeline";

export const dynamic = "force-dynamic";
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; view?: string }>;
}) {
  const t = await getT();
  const person = await actor(true);
  const { after, view } = await searchParams;
  const archived = view === "archived";
  const firstPage = archived ? "/projects?view=archived" : "/projects";
  const title = t(archived ? "Archived explorations" : "Explorations");
  const db = database(),
    service = projectService(db);
  const [page, totals] = await Promise.all([
    service.page(person, after, archived).catch((error) => {
      if (error instanceof ProjectError) notFound();
      throw error;
    }),
    service.groupCounts(person, archived),
  ]);
  const projects = page.items;
  const ids = projects.map((p) => p.id);
  const [progress, counts] = await Promise.all([
    projectProgress(db, person, ids),
    projectActivityCounts(db, person, ids),
  ]);
  const groups = groupProjectsByType(projects, t);
  const actions = (
    <>
      <Link
        href={archived ? "/projects" : "/projects?view=archived"}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        {t(archived ? "Active projects" : "Archived projects")}
      </Link>
      {!archived && <NewProjectButton />}
    </>
  );
  return (
    <Workspace id="main" variant="dashboard" className={explorationIndexSpacing}>
      <h1 className="sr-only">{title}</h1>
      {!projects.length && <ExplorationIndexHeading actions={actions} />}
      <section aria-label={t("Your projects")} className="grid gap-6">
        {projects.length ? (
          groups.map((group, index) => (
            <section key={group.id ?? "unset"} aria-label={t(group.name)}>
              <ExplorationIndexHeading
                actions={index === 0 ? actions : undefined}
                label={t(group.name)}
                count={
                  totals.find((row) => row.flow_id === group.id)?.total ?? group.projects.length
                }
              />
              <div className="project-list grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-2">
                {group.projects.map((p) => {
                  const c = counts.get(p.id);
                  return (
                    <ProjectCard key={p.id} project={p}>
                      <ProjectTimeline stages={progress.get(p.id)} t={t} />
                      {c && (
                        <dl className="mt-3 border-t border-line pt-2 grid gap-0.5 text-xs text-muted tabular-nums">
                          {[
                            [t("Milestones"), `${c.covered}/${c.milestones} ${t("completed")}`],
                            [t("Tasks"), `${c.open_tasks} ${t("open")} · ${c.tasks} ${t("total")}`],
                            [
                              t("Experiments"),
                              `${c.active} ${t("active")} · ${c.completed} ${t("completed")} · ${c.experiments} ${t("total")}`,
                            ],
                            ...(group.id === "shirt-eshop"
                              ? [
                                  [
                                    t("Shirt designs"),
                                    `${c.shirts} ${t(c.shirts === 1 ? "design" : "designs")} · ${c.collections} ${t(c.collections === 1 ? "collection" : "collections")}`,
                                  ],
                                ]
                              : []),
                          ].map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-2">
                              <dt>{label}</dt>
                              <dd className="m-0">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </ProjectCard>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div
            className={
              "empty-state text-center py-15 px-5 [border:1px_dashed_var(--color-line)] rounded-[12px] text-muted lg:compact:py-6 lg:compact:px-4"
            }
          >
            <span aria-hidden="true" className={"text-[52px] text-lime lg:compact:text-[30px]"}>
              <WaveMark />
            </span>
            <h3
              className={
                "mb-[1em] font-sans tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 text-ink mt-5"
              }
            >
              {t(
                after ? "No more projects" : archived ? "No archived projects" : "No projects yet",
              )}
            </h3>
            {!after && !archived && (
              <p className={"mb-[1em] mt-0 text-[14px]"}>
                {t("Create an exploration to get started.")}
              </p>
            )}
          </div>
        )}
      </section>
      {(after || page.next) && (
        <nav className="flex gap-4 mt-4" aria-label={t("Project pages")}>
          {after && <Link href={firstPage}>{t("First page")}</Link>}
          {page.next && (
            <Link href={`${firstPage}${archived ? "&" : "?"}after=${page.next}`}>
              {t("More projects")}
            </Link>
          )}
        </nav>
      )}
    </Workspace>
  );
}
