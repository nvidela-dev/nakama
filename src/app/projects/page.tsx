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
    <main
      id="main"
      className={
        "workspace max-w-300 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-none lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0"
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
          "workspace-columns grid grid-cols-[1.3fr_1fr] gap-8 items-start max-[1000px]:grid-cols-[1fr_1fr] max-[700px]:grid-cols-[1fr] lg:compact:grid-cols-[minmax(0,_1fr)_300px] lg:compact:gap-5 lg:compact:[&_>_*]:min-w-0 min-[2000px]:compact:grid-cols-[minmax(0,_1fr)_340px] min-[2000px]:compact:gap-7"
        }
      >
        <section
          className={
            "project-list lg:compact:grid lg:compact:grid-cols-[repeat(auto-fill,_minmax(320px,_1fr))] lg:compact:gap-2.5 lg:compact:items-stretch lg:compact:[&_>_.empty-state]:[grid-column:1_/_-1] lg:compact:[&_>_.empty-state]:mb-0 lg:compact:[&_.project-card]:mb-0"
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
          className={"main-screen-sidebar grid gap-4 min-w-0 content-start max-[700px]:[order:-1]"}
        >
          <NewProjectButton />
          {allowed && (
            <Panel
              className={"main-whitelist [&_.people-list_li]:flex-wrap [&_.people-list_li]:gap-2"}
            >
              <h2
                className={
                  "mb-[0.83em] mt-0 font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
                }
              >
                {t("Allow a person")}
              </h2>
              <AddAllowedEmail />
              <details className={"mt-4.5"}>
                <summary
                  className={
                    "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5"
                  }
                >
                  {t("Allowed emails")}{" "}
                  <span
                    className={
                      "count text-[13px] align-middle text-muted border border-line py-0.75 px-2.25 rounded-[100px] ml-2"
                    }
                  >
                    {allowed.length}
                  </span>
                </summary>
                <p className={"muted mb-[1em] mt-0 text-muted text-[12px]"}>
                  {t(
                    "Removing access blocks future private requests. It does not delete the account or project history.",
                  )}
                </p>
                <WhitelistList entries={allowed} />
              </details>
              {requests && (
                <details className={"mt-4.5"}>
                  <summary
                    className={
                      "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5"
                    }
                  >
                    {t("Access requests")}{" "}
                    <span
                      className={
                        "count text-[13px] align-middle text-muted border border-line py-0.75 px-2.25 rounded-[100px] ml-2"
                      }
                    >
                      {requests.length}
                    </span>
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
