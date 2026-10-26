import { ProjectRelations } from "@/features/projects/components/project-relations";
import { projectLinksService } from "@/features/projects/server/project-links";
import { ArtifactLibrary } from "@/features/artifacts/components/artifact-library";
import { artifactService } from "@/features/artifacts/server/artifacts";
import { taskService } from "@/features/tasks/server/tasks";
import { TaskList } from "@/features/tasks/components/task-list";
import { ProjectWork } from "@/features/projects/components/project-work";
import { invitationCandidates } from "@/features/collaboration/server/invitation-candidates";
import { getT } from "@/shared/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError, projectService } from "@/features/projects/server/projects";
import { AccessButton, InviteForm } from "@/features/collaboration/components/forms";
import { guidanceService } from "@/features/guidance/server/guidance";
import { FlowChooser } from "@/features/guidance/components/flow-chooser";
import { ProjectSettings } from "@/features/projects/components/project-settings";
import { Discussion } from "@/features/collaboration/components/discussion";
import { ActivityFeed } from "@/features/collaboration/components/activity-feed";
import { collaborationService, commentTarget } from "@/features/collaboration/server/collaboration";
import { Journey } from "@/features/guidance/components/journey";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    stage?: string;
    node?: string;
    view?: string;
    commentsBefore?: string;
    comment?: string;
    activityBefore?: string;
  }>;
}) {
  const t = await getT();
  const person = await actor();
  const { projectId } = await params;
  const service = projectService(database());
  const query = await searchParams;
  const isTasksView = query.view === "tasks";
  const isArtifactsView = query.view === "artifacts";
  const targetStageId = isTasksView ? "tasks" : isArtifactsView ? "artifacts" : query.stage;
  const targetNodeId = isTasksView || isArtifactsView ? undefined : query.node;
  const target = commentTarget(targetStageId, targetNodeId);
  let project, people, guidance, comments, activity, tasks, artifacts, links, accessibleProjects;
  let history: Awaited<ReturnType<ReturnType<typeof guidanceService>["history"]>> = [];
  try {
    [
      project,
      people,
      guidance,
      history,
      comments,
      activity,
      tasks,
      artifacts,
      links,
      accessibleProjects,
    ] = await Promise.all([
      service.get(person, projectId),
      service.people(person, projectId),
      guidanceService(database()).get(person, projectId),
      query.node
        ? guidanceService(database()).history(person, projectId, query.node)
        : Promise.resolve([]),
      collaborationService(database()).comments(
        person,
        projectId,
        target,
        query.commentsBefore,
        query.comment,
      ),
      collaborationService(database()).activity(person, projectId, query.activityBefore),
      taskService(database()).list(person, projectId),
      artifactService(database()).list(person, projectId),
      projectLinksService(database()).list(person, projectId),
      service.list(person),
    ]);
  } catch (error) {
    if (error instanceof ProjectError) notFound();
    throw error;
  }
  const artifactLibrary = (
    <ArtifactLibrary
      items={artifacts}
      projects={[{ id: projectId, name: project.name }]}
      projectId={projectId}
      stages={guidance?.flow.stages.map(({ id, name }) => ({ id, name })) ?? []}
      stageId={query.stage}
    />
  );
  const candidates = project.role === "owner" ? await invitationCandidates(person, projectId) : [];
  const selectedStage = guidance?.flow.stages.find((stage) => stage.id === query.stage);
  const selectedNode = selectedStage?.nodes.find((node) => node.id === query.node);
  const discussionLabel = isTasksView
    ? t("To-do discussion")
    : isArtifactsView
      ? t("Artifacts discussion")
      : selectedNode
        ? t(selectedNode.label)
        : selectedStage
          ? t(selectedStage.name)
          : t("Project discussion");
  function pageHref(kind: "commentsBefore" | "activityBefore", value?: string) {
    const params = new URLSearchParams();
    if (query.view) params.set("view", query.view);
    if (!isTasksView && !isArtifactsView) {
      if (query.stage) params.set("stage", query.stage);
      if (query.node) params.set("node", query.node);
    }
    if (query.commentsBefore && kind !== "commentsBefore")
      params.set("commentsBefore", query.commentsBefore);
    if (query.activityBefore && kind !== "activityBefore")
      params.set("activityBefore", query.activityBefore);
    if (value) params.set(kind, value);
    return `/projects/${projectId}${params.size ? `?${params}` : ""}`;
  }
  const sidebar = (
    <>
      <ProjectRelations
        projectId={projectId}
        links={links}
        projects={accessibleProjects.map(({ id, name }) => ({ id, name }))}
      />
      <details
        open
        className={
          "panel project-people-panel bg-panel border border-line min-w-0 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] p-3 rounded-[8px] [&_.form-stack]:gap-1.5 [&_.form-stack_label]:text-[11px] [&_.form-stack_label]:leading-[1.4] [&_.form-stack_small]:text-[10px] [&_.form-stack_small]:leading-[1.45] [&_select]:min-w-0 [&_select]:w-full [&_select]:text-[11px] [&_select]:py-1.25 [&_select]:px-2 [&_select]:min-h-7 [&_input]:min-w-0 [&_input]:text-[11px] [&_input]:py-1.25 [&_input]:px-2 [&_button]:m-0 [&_button]:min-h-7 [&_button]:py-1.25 [&_button]:px-2 [&_button]:text-[11px] [&_button]:leading-[1.4] [&_.project-activity]:mt-3 [&_.project-activity]:pt-2.5 [&_.project-activity_>_summary]:text-[11px] [&_.project-activity_>_summary]:leading-[1.5] [&_.project-activity_>_summary]:cursor-pointer [&_.project-activity_>_p]:my-2 [&_.project-activity_>_p]:mx-0 [&_.project-activity_>_p]:text-[10px] [&_.project-activity_>_p]:leading-[1.45] [&_.activity-list]:my-2 [&_.activity-list]:mx-0 [&_.activity-list_li]:py-1.75 [&_.activity-list_p]:text-[11px] [&_.activity-list_p]:leading-[1.4] [&_.activity-list_time]:text-[10px] [&_.activity-list_time]:leading-[1.4] [&_.activity-list_small]:text-[10px] [&_.activity-list_small]:leading-[1.4] [&_.project-activity_a]:text-[11px] pointer-coarse:[&_button]:min-h-11 pointer-coarse:[&_select]:min-h-11 pointer-coarse:[&_.project-activity_>_summary]:min-h-11 pointer-coarse:[&_.project-activity_>_summary]:[align-content:center]"
        }
      >
        <summary className="cursor-pointer select-none [[open]>&]:mb-3">
          <h2
            className={
              "font-mono tracking-[-0.045em] font-medium m-0 text-[14px] leading-[1.3] inline-flex items-center"
            }
          >
            {t("Members")}{" "}
            <span
              className={
                "count align-middle text-muted border border-line rounded-[100px] text-[10px] py-0.5 px-1.5 ml-1.25"
              }
            >
              {people.members.length}
            </span>
          </h2>
        </summary>
        <div className="project-members">
          <ul className={"people-list my-[1em] list-none p-0 lg:compact:mb-3.5 mt-0 mx-0 mb-2"}>
            {people.members.map((m) => (
              <li
                key={m.user_id}
                className={
                  "border-b border-b-line flex items-center justify-between wrap-anywhere max-[700px]:flex-wrap lg:compact:py-2 lg:compact:gap-2 lg:compact:flex-wrap py-1.5 px-0 gap-1.5"
                }
              >
                <div>
                  <strong className={"text-[13px] text-[11px] leading-[1.4]"}>
                    {m.user_id === person.userId ? t("You") : m.display_name}
                  </strong>
                  <small className={"block text-muted text-[10px] leading-[1.4]"}>
                    {t(m.role)}
                  </small>
                </div>
                {project.role === "owner" && m.role === "member" && (
                  <AccessButton projectId={projectId} id={m.user_id} operation="remove" />
                )}
              </li>
            ))}
          </ul>
          {project.role === "owner" && (
            <>
              <h3
                className={
                  "font-mono tracking-[-0.045em] font-semibold lg:compact:text-[15px] lg:compact:mb-2 lg:compact:mt-4.5 mt-2.5 mx-0 mb-1.5 text-[11px] leading-[1.4]"
                }
              >
                {t("Invite member")}
              </h3>
              <InviteForm projectId={projectId} candidates={candidates} />
              <h3
                className={
                  "font-mono tracking-[-0.045em] font-semibold lg:compact:text-[15px] lg:compact:mb-2 lg:compact:mt-4.5 mt-2.5 mx-0 mb-1.5 text-[11px] leading-[1.4]"
                }
              >
                {t("Invitations")}
              </h3>
              {people.invitations.length ? (
                <ul
                  className={"people-list my-[1em] list-none p-0 lg:compact:mb-3.5 mt-0 mx-0 mb-2"}
                >
                  {people.invitations.map((inv) => (
                    <li
                      key={inv.id}
                      className={
                        "border-b border-b-line flex items-center justify-between wrap-anywhere max-[700px]:flex-wrap lg:compact:py-2 lg:compact:gap-2 lg:compact:flex-wrap py-1.5 px-0 gap-1.5"
                      }
                    >
                      <div>
                        <strong className={"text-[13px] text-[11px] leading-[1.4]"}>
                          {inv.email}
                        </strong>
                        <small className={"block text-muted text-[10px] leading-[1.4]"}>
                          {inv.revoked_at
                            ? t("Revoked")
                            : inv.accepted_at
                              ? t("Accepted")
                              : new Date(inv.expires_at) <= new Date()
                                ? t("Expired")
                                : t("Pending")}
                        </small>
                      </div>
                      {!inv.revoked_at &&
                        !inv.accepted_at &&
                        new Date(inv.expires_at) > new Date() && (
                          <AccessButton projectId={projectId} id={inv.id} operation="revoke" />
                        )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={"muted text-muted m-0 text-[11px] leading-[1.4]"}>
                  {t("No invitations yet.")}
                </p>
              )}
            </>
          )}
        </div>
        <ActivityFeed
          projectId={projectId}
          activity={activity}
          flow={guidance?.flow}
          open={!query.stage || !!query.activityBefore}
          olderHref={activity.next ? pageHref("activityBefore", activity.next) : undefined}
          latestHref={query.activityBefore ? pageHref("activityBefore") : undefined}
        />
      </details>
      {project.role === "owner" && (
        <ProjectSettings
          projectId={projectId}
          name={project.name}
          description={project.description}
          contentRevision={guidance?.contentRevision ?? 0}
        />
      )}
    </>
  );
  const discussion = (
    <Discussion
      key={`${projectId}:${targetStageId ?? "project"}:${targetNodeId ?? "stage"}`}
      projectId={projectId}
      target={target}
      label={discussionLabel}
      comments={comments}
      userId={person.userId}
      owner={project.role === "owner"}
      olderHref={comments.next ? pageHref("commentsBefore", comments.next) : undefined}
      latestHref={query.commentsBefore || query.comment ? pageHref("commentsBefore") : undefined}
    />
  );
  return (
    <main
      id="main"
      className={
        "workspace max-w-300 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-none lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6"
      }
    >
      <div
        className={
          "page-heading project-heading mx-0 mb-10.5 max-[700px]:mt-6 lg:compact:mb-5 mt-0"
        }
      >
        <div className={"project-heading-line flex items-center gap-5 flex-wrap"}>
          <Link className={"back-link text-[13px] text-muted m-0 shrink-0"} href="/projects">
            {t("← Your projects")}
          </Link>
          <h1
            className={
              "font-mono tracking-[-0.045em] text-[clamp(36px,_5vw,_66px)] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[38px] lg:compact:text-[30px] lg:compact:leading-[1.15] lg:compact:max-w-none lg:compact:my-1.75 lg:compact:mx-0 lg:compact:tracking-[-1px] m-0 min-w-0"
            }
          >
            {project.name}
          </h1>
        </div>
        <p
          className={
            "preserve-lines mb-[1em] mt-0 whitespace-pre-wrap wrap-anywhere text-muted max-w-175 lg:compact:max-w-none lg:compact:mt-2 lg:compact:mx-0 lg:compact:mb-0 lg:compact:text-[13px] lg:compact:leading-[1.5]"
          }
        >
          {project.description}
        </p>
      </div>
      <nav className="flex flex-wrap gap-3 my-4" aria-label={t("Project lab")}>
        <Link
          className="text-lime underline"
          href={`/projects/${projectId}/lab${query.node ? `?node=${encodeURIComponent(query.node)}` : ""}`}
        >
          {t(query.node ? "Explore this question in the lab" : "Open experiment lab")}
        </Link>
      </nav>
      {guidance ? (
        <Journey
          projectId={projectId}
          guidance={guidance}
          stageId={query.stage}
          nodeId={query.node}
          history={history}
          names={Object.fromEntries(people.members.map((m) => [m.user_id, m.display_name]))}
          sidebar={sidebar}
          discussion={discussion}
          tasks={<TaskList projectId={projectId} initial={tasks} />}
          artifacts={artifactLibrary}
        />
      ) : (
        <div
          className={
            "workspace-columns project-capture-workspace has-discussion [&_>_.project-discussion-column_>_.discussion]:mt-0 grid grid-cols-[1.3fr_1fr] gap-8 items-start max-[1000px]:grid-cols-[1fr_1fr] max-[700px]:grid-cols-[1fr] lg:compact:grid-cols-[minmax(0,_1fr)_300px] lg:compact:gap-5 lg:compact:[&_>_*]:min-w-0 min-[2000px]:compact:grid-cols-[minmax(0,_1fr)_340px] min-[2000px]:compact:gap-7 min-[1280px]:grid-cols-[clamp(240px,_20vw,_380px)_minmax(0,_1fr)_clamp(220px,_18vw,_340px)] min-[1280px]:gap-5"
          }
        >
          <div
            className={
              "project-working-column min-w-0 bg-panel border border-line rounded-[10px] p-4 lg:compact:py-3.5 lg:compact:px-4 [&_.answer-panel]:bg-[var(--theme-surface-low,#14221f)] col-start-1 row-start-1 min-[1280px]:col-start-2"
            }
          >
            <ProjectWork
              tasks={<TaskList projectId={projectId} initial={tasks} />}
              artifacts={artifactLibrary}
            >
              <FlowChooser projectId={projectId} />
            </ProjectWork>
          </div>
          <div
            className={
              "project-discussion-column min-[1280px]:[&_>_.discussion]:flex min-[1280px]:[&_>_.discussion]:flex-col min-[1280px]:[&_>_.discussion]:max-h-[calc(100dvh_-_40px)] min-[1280px]:[&_>_.discussion]:overflow-y-auto col-start-1 row-start-2 min-w-0 min-[1280px]:row-start-1 min-[1280px]:sticky min-[1280px]:top-5 min-[1280px]:max-h-[calc(100dvh_-_40px)]"
            }
          >
            {discussion}
          </div>
          <div
            className={
              "project-sidebar grid gap-4 min-w-0 content-start [&_.project-settings]:mb-0 col-start-2 [grid-row:1_/_span_2] max-[700px]:col-start-1 max-[700px]:row-start-3 min-[1280px]:col-start-3 min-[1280px]:row-start-1"
            }
          >
            {sidebar}
          </div>
        </div>
      )}
    </main>
  );
}
