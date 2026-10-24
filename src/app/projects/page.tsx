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
    <main
      id="main"
      className={
        "workspace w-full max-w-300 lg:max-w-360 lg:compact:max-w-360 min-[1280px]:[&:has(>_.has-discussion)]:max-w-360 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0"
      }
    >
      <div
        className={
          "page-heading mt-7.5 mx-0 mb-10.5 [&_p]:text-muted [&_p]:max-w-175 max-[700px]:mt-6 lg:compact:mt-3.5 lg:compact:mb-5 lg:compact:[&_p]:max-w-none lg:compact:[&_p]:mt-2 lg:compact:[&_p]:mx-0 lg:compact:[&_p]:mb-0 lg:compact:[&_p]:text-[13px] lg:compact:[&_p]:leading-[1.5]"
        }
      >
        <h1
          aria-label={t("Projects")}
          className={
            "mb-[0.67em] mt-0 font-mono tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[38px] lg:compact:text-[30px] lg:compact:leading-[1.15] lg:compact:max-w-none lg:compact:my-1.75 lg:compact:mx-0 lg:compact:tracking-[-1px]"
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
      <div
        className={
          "workspace-columns grid w-full max-w-full grid-cols-1 min-[701px]:grid-cols-12 gap-6 lg:compact:gap-5 items-start"
        }
      >
        <section
          className={
            "project-list min-w-0 max-w-full col-span-1 min-[701px]:col-span-7 min-[1001px]:col-span-8 min-[1280px]:col-span-9 lg:compact:grid lg:compact:grid-cols-[repeat(auto-fill,_minmax(320px,_1fr))] lg:compact:gap-2.5 lg:compact:items-stretch lg:compact:[&_>_.empty-state]:[grid-column:1_/_-1] lg:compact:[&_>_.empty-state]:mb-0 lg:compact:[&_.project-card]:mb-0"
          }
        >
          <h2
            className={
              "sr-only font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 absolute w-0.25 h-0.25 p-0 -m-0.25 overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0 lg:compact:[grid-column:1_/_-1] lg:compact:mb-0"
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
                  "mb-[1em] font-mono tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 text-ink mt-5"
                }
              >
                {t("No projects yet")}
              </h3>
              <p className={"mb-[1em] mt-0 text-[14px]"}>{t("Create a project to get started.")}</p>
            </div>
          )}
        </section>
        <aside
          className={
            "main-screen-sidebar grid gap-4 min-w-0 max-w-full overflow-hidden content-start col-span-1 min-[701px]:col-span-5 min-[1001px]:col-span-4 min-[1280px]:col-span-3 max-[700px]:[order:-1]"
          }
        >
          <NewProjectButton />
        </aside>
      </div>
    </main>
  );
}
