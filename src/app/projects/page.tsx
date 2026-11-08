import { WaveMark } from "@/shared/ui/wave-mark";
import { getT } from "@/shared/i18n/server";
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
export default async function ProjectsPage() {
  const t = await getT();
  const person = await actor(true);
  const [projects, progress, counts] = await Promise.all([
    projectService(database()).list(person),
    projectProgress(database(), person),
    projectActivityCounts(database(), person),
  ]);
  const groups = groupProjectsByType(projects, t);
  return (
    <main id="main" className="workspace w-full p-4 lg:p-6 min-h-[70vh]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1
          aria-label={t("Projects")}
          className={
            "mb-[0.67em] mt-0 font-sans tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[38px] lg:compact:text-[30px] lg:compact:leading-[1.15] lg:compact:max-w-none lg:compact:my-1.75 lg:compact:mx-0 lg:compact:tracking-[-1px]"
          }
        >
          {t("Projects")}{" "}
          <span
            className={
              "count text-[13px] align-middle text-muted border border-line py-0.75 px-2.25 rounded-[100px] ml-2"
            }
          >
            {projects.length}
          </span>
        </h1>
      </div>
      <section aria-label={t("Your projects")} className="grid gap-6">
        {projects.length ? (
          groups.map((group) => (
            <section key={group.id ?? "unset"} aria-label={t(group.name)}>
              <h2 className="flex items-baseline gap-2 mb-2 font-semibold text-base">
                {t(group.name)}{" "}
                <small className="text-muted font-normal">{group.projects.length}</small>
              </h2>
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
              {t("No projects yet")}
            </h3>
            <p className={"mb-[1em] mt-0 text-[14px]"}>{t("Create a project to get started.")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
