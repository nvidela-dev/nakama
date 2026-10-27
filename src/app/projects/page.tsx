import { WaveMark } from "@/shared/ui/wave-mark";
import { getT } from "@/shared/i18n/server";
import { ProjectCard } from "@/features/projects/components/project-card";
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
  const [projects, progress] = await Promise.all([
    projectService(database()).list(person),
    projectProgress(database(), person),
  ]);
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
        <div className="w-full sm:w-auto">
          <NewProjectButton />
        </div>
      </div>
      <section className="project-list grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3 items-stretch [&_.project-card]:mb-0">
        <h2
          className={
            "sr-only font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 absolute w-0.25 h-0.25 p-0 -m-0.25 overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0 lg:compact:[grid-column:1_/_-1] lg:compact:mb-0"
          }
        >
          {t("Your projects")}
        </h2>
        {projects.length ? (
          projects.map((p) => (
            <ProjectCard key={p.id} project={p}>
              <ProjectTimeline stages={progress.get(p.id)} t={t} />
            </ProjectCard>
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
