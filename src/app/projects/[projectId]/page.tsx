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
        className={
          "panel project-people-panel bg-panel border border-line min-w-0 max-w-full max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] p-3 rounded-[8px] [&_.form-stack]:gap-1.5 [&_.form-stack_label]:text-[11px] [&_.form-stack_label]:leading-[1.4] [&_.form-stack_small]:text-[10px] [&_.form-stack_small]:leading-[1.45] [&_select]:min-w-0 [&_select]:w-full [&_select]:text-[11px] [&_select]:py-1.25 [&_select]:px-2 [&_select]:min-h-7 [&_input]:min-w-0 [&_input]:text-[11px] [&_input]:py-1.25 [&_input]:px-2 [&_button]:m-0 [&_button]:min-h-7 [&_button]:py-1.25 [&_button]:px-2 [&_button]:text-[11px] [&_button]:leading-[1.4] pointer-coarse:[&_button]:min-h-11 pointer-coarse:[&_select]:min-h-11"
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
        <div className="project-members grid gap-2.5 min-w-0 max-w-full">
          <ul className={"people-list list-none p-0 m-0 min-w-0"}>
            {people.members.map((m) => (
              <li
                key={m.user_id}
                className={
                  "border-b border-b-line last:border-b-0 flex items-center justify-between min-w-0 break-words wrap-anywhere flex-wrap py-1 px-0 gap-1.5"
                }
              >
                <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap break-words wrap-anywhere">
                  <strong className={"text-[11px] leading-[1.4] break-words"}>
                    {m.user_id === person.userId ? t("You") : m.display_name}
                  </strong>
                  <small className={"text-muted text-[10px] leading-[1.4]"}>{t(m.role)}</small>
                </div>
                {project.role === "owner" && m.role === "member" && (
                  <AccessButton projectId={projectId} id={m.user_id} operation="remove" />
                )}
              </li>
            ))}
          </ul>
          {project.role === "owner" && (
            <>
              <InviteForm projectId={projectId} candidates={candidates} />
              {people.invitations.length > 0 && (
                <div className="min-w-0 max-w-full pt-1 border-t border-t-line">
                  <h3
                    className={
                      "font-mono tracking-[-0.045em] font-medium text-muted m-0 mb-1 text-[10px] uppercase leading-[1.4]"
                    }
                  >
                    {t("Invitations")}
                  </h3>
                  <ul className={"people-list list-none p-0 m-0 min-w-0"}>
                    {people.invitations.map((inv) => (
                      <li
                        key={inv.id}
                        className={
                          "border-b border-b-line last:border-b-0 flex items-center justify-between min-w-0 break-words wrap-anywhere flex-wrap py-1 px-0 gap-1.5"
                        }
                      >
                        <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap break-words wrap-anywhere">
                          <strong className={"text-[11px] leading-[1.4] break-words"}>
                            {inv.email}
                          </strong>
                          <small className={"text-muted text-[10px] leading-[1.4]"}>
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
                </div>
              )}
            </>
          )}
        </div>
      </details>
      <ActivityFeed
        projectId={projectId}
        activity={activity}
        flow={guidance?.flow}
        open={Boolean(query.activityBefore)}
        olderHref={activity.next ? pageHref("activityBefore", activity.next) : undefined}
        latestHref={query.activityBefore ? pageHref("activityBefore") : undefined}
      />
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
        "workspace w-full max-w-300 lg:max-w-360 lg:compact:max-w-360 min-[1280px]:[&:has(>_.has-discussion)]:max-w-360 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:px-6"
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
            "workspace-columns project-capture-workspace has-discussion [&_>_.project-discussion-column_>_.discussion]:mt-0 grid w-full max-w-full grid-cols-1 min-[701px]:grid-cols-12 gap-6 lg:compact:gap-5 items-start"
          }
        >
          <div
            className={
              "project-working-column min-w-0 max-w-full overflow-hidden bg-panel border border-line rounded-[10px] p-4 lg:compact:py-3.5 lg:compact:px-4 [&_.answer-panel]:bg-[var(--theme-surface-low,#14221f)] col-span-1 col-start-1 row-start-1 min-[701px]:col-span-7 min-[1001px]:col-span-8 min-[1280px]:col-span-6 min-[1280px]:col-start-4 min-[1280px]:row-start-1"
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
              "project-discussion-column min-w-0 max-w-full overflow-hidden col-span-1 col-start-1 row-start-2 min-[701px]:col-span-7 min-[1001px]:col-span-8 min-[1280px]:col-span-3 min-[1280px]:col-start-1 min-[1280px]:row-start-1 min-[1280px]:sticky min-[1280px]:top-5 min-[1280px]:max-h-[calc(100dvh_-_40px)] min-[1280px]:[&_>_.discussion]:flex min-[1280px]:[&_>_.discussion]:flex-col min-[1280px]:[&_>_.discussion]:max-h-[calc(100dvh_-_40px)] min-[1280px]:[&_>_.discussion]:overflow-y-auto"
            }
          >
            {discussion}
          </div>
          <div
            className={
              "project-sidebar grid gap-4 min-w-0 max-w-full overflow-hidden content-start [&_.project-settings]:mb-0 col-span-1 col-start-1 row-start-3 min-[701px]:col-span-5 min-[701px]:col-start-8 min-[701px]:row-span-2 min-[701px]:row-start-1 min-[1001px]:col-span-4 min-[1001px]:col-start-9 min-[1280px]:col-span-3 min-[1280px]:col-start-10 min-[1280px]:row-span-1 min-[1280px]:row-start-1"
            }
          >
            {sidebar}
          </div>
        </div>
      )}
    </main>
  );
}
