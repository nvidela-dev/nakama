import { PageHeading, SidebarSection, Workspace } from "@/shared/ui/workspace-layout";
import { loadWorkspace } from "./workspace";
import { ProjectTests } from "@/features/experiments/components/project-tests";
import { experimentPrompts } from "@/features/experiments/flow-prompts";
import { productionStages } from "@/features/tasks/milestone-catalog";

import { ProjectRelations } from "@/features/projects/components/project-relations";
import { ArtifactLibrary } from "@/features/artifacts/components/artifact-library";
import { ProjectTasks } from "@/features/tasks/components/project-tasks";
import { ProjectWork } from "@/features/projects/components/project-work";
import { invitationCandidates } from "@/features/collaboration/server/invitation-candidates";
import { getT } from "@/shared/i18n/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { ProjectError } from "@/features/projects/server/projects";
import { AccessButton, InviteForm } from "@/features/collaboration/components/forms";
import { FlowChooser } from "@/features/guidance/components/flow-chooser";
import { ProjectSettings } from "@/features/projects/components/project-settings";
import { Discussion } from "@/features/collaboration/components/discussion";
import { ActivityFeed } from "@/features/collaboration/components/activity-feed";
import { commentTarget } from "@/features/collaboration/server/collaboration";
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
  const query = await searchParams;
  if (query.view === "tasks" && query.comment)
    redirect(
      `/projects/${projectId}/discussion?comment=${encodeURIComponent(query.comment)}#comment-${encodeURIComponent(query.comment)}`,
    );
  const isTasksView = query.view === "tasks";
  const isArtifactsView = query.view === "artifacts";
  const isTestsView = query.view === "tests";
  const isActivityView = query.view === "activity" || (!query.view && !!query.activityBefore);
  if (isActivityView && !query.view)
    redirect(
      `/projects/${projectId}?view=activity&activityBefore=${encodeURIComponent(query.activityBefore!)}`,
    );
  const focusedWork = isTasksView || isTestsView || isActivityView;
  const targetStageId = isTasksView
    ? "tasks"
    : isArtifactsView
      ? "artifacts"
      : isTestsView
        ? undefined
        : query.stage;
  const targetNodeId = focusedWork || isArtifactsView ? undefined : query.node;
  const target = commentTarget(targetStageId, targetNodeId);
  let workspace;
  try {
    workspace = await loadWorkspace(database(), person, projectId, {
      ...query,
      target,
      focusedWork,
      activityView: isActivityView,
    });
  } catch (error) {
    if (error instanceof ProjectError) notFound();
    throw error;
  }
  const {
    project,
    people,
    guidance,
    history,
    comments,
    activity,
    tasks,
    artifacts,
    artifactChoices,
    links,
    accessibleProjects,
  } = workspace;
  const taskPanel = tasks && (
    <ProjectTasks
      projectId={projectId}
      initial={tasks}
      artifacts={artifactChoices}
      flowId={guidance?.flow.id ?? null}
    />
  );
  const artifactLibrary = artifacts && (
    <ArtifactLibrary
      items={artifacts}
      projects={[{ id: projectId, name: project.name, flow_id: guidance?.flow.id ?? null }]}
      projectId={projectId}
      stages={guidance?.flow.stages.map(({ id, name }) => ({ id, name })) ?? []}
      stageId={query.stage}
    />
  );
  const prompts = guidance ? experimentPrompts[guidance.flow.id] : undefined;
  const tests = (
    <ProjectTests
      projectId={projectId}
      questions={
        guidance?.flow.stages.flatMap((stage) =>
          stage.nodes
            .filter((node) => node.kind === "question")
            .map((node) => ({ id: node.id, label: t(node.label), stageId: stage.id })),
        ) ?? []
      }
      names={Object.fromEntries(
        people.members.map((member) => [member.user_id, member.display_name]),
      )}
      prompts={
        prompts
          ? {
              claim: t(prompts.claim),
              method: t(prompts.method),
              criteria: t(prompts.criteria),
              evidence: t(prompts.evidence),
            }
          : undefined
      }
    />
  );
  const candidates =
    !focusedWork && project.role === "owner" ? await invitationCandidates(person, projectId) : [];
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
  const activityPanel = (
    <ActivityFeed
      projectId={projectId}
      activity={activity}
      flow={guidance?.flow}
      olderHref={activity.next ? pageHref("activityBefore", activity.next) : undefined}
      latestHref={query.activityBefore ? pageHref("activityBefore") : undefined}
    />
  );
  const sidebar = (
    <>
      <ProjectRelations
        projectId={projectId}
        links={links}
        projects={accessibleProjects.map(({ id, name }) => ({ id, name }))}
      />
      <SidebarSection
        open
        heading={t("Members")}
        count={people.members.length}
        className="project-people-panel [&_.form-stack]:gap-1.5 [&_.form-stack_label]:text-[11px] [&_.form-stack_label]:leading-[1.4] [&_.form-stack_small]:text-[11px] [&_.form-stack_small]:leading-[1.45] [&_select]:w-full pointer-coarse:[&_button]:min-h-11 pointer-coarse:[&_select]:min-h-11"
      >
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
                  <small className={"text-muted text-[11px] leading-[1.4]"}>{t(m.role)}</small>
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
                      "font-sans tracking-[-0.045em] font-medium text-muted m-0 mb-1 text-[11px] uppercase leading-[1.4]"
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
                          <small className={"text-muted text-[11px] leading-[1.4]"}>
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
      </SidebarSection>

      {project.role === "owner" && (
        <ProjectSettings
          archived={project.archived}
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
    <Workspace id="main" variant="project">
      <PageHeading compact>
        <div className={"project-heading-line flex items-center gap-3 flex-wrap"}>
          <Link
            className={"back-link text-[13px] text-muted m-0 shrink-0"}
            href={project.archived ? "/projects?view=archived" : "/projects"}
          >
            {project.archived ? `← ${t("Archived projects")}` : t("← Your projects")}
          </Link>
          <h1
            className={
              "font-sans tracking-[-0.045em] text-[26px] font-medium max-w-212.5 wrap-anywhere max-[700px]:text-[23px] lg:compact:text-[24px] lg:compact:leading-[1.15] lg:compact:max-w-none lg:compact:my-0 lg:compact:mx-0 lg:compact:tracking-[-1px] m-0 min-w-0"
            }
          >
            {project.name}
          </h1>
          {project.archived && <span className="text-sm text-muted">{t("Archived")}</span>}
        </div>
        <p
          className={
            "preserve-lines mb-[1em] mt-0 whitespace-pre-wrap wrap-anywhere text-muted max-w-175 lg:compact:max-w-none lg:compact:mt-1 lg:compact:mx-0 lg:compact:mb-0 lg:compact:text-[13px] lg:compact:leading-[1.5]"
          }
        >
          {project.description}
        </p>
      </PageHeading>
      {guidance ? (
        <Journey
          productionStages={productionStages[guidance.flow.id]}
          wideWork={focusedWork}
          projectId={projectId}
          guidance={guidance}
          stageId={query.stage}
          nodeId={query.node}
          history={history}
          names={Object.fromEntries(people.members.map((m) => [m.user_id, m.display_name]))}
          sidebar={sidebar}
          discussion={discussion}
          tasks={taskPanel}
          artifacts={artifactLibrary}
          tests={tests}
          activity={activityPanel}
        />
      ) : (
        <div
          className={[
            "workspace-columns project-capture-workspace has-discussion [&_>_.project-discussion-column_>_.discussion]:mt-0 grid w-full max-w-full grid-cols-1 min-[701px]:grid-cols-12 gap-3 lg:compact:gap-3 items-start",
            focusedWork && "[&_.project-working-column]:col-span-full!",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            className={
              "project-working-column min-w-0 max-w-full overflow-hidden bg-panel border border-line rounded-[10px] p-4 lg:compact:py-3.5 lg:compact:px-4 [&_.answer-panel]:bg-[var(--theme-surface-low,#14221f)] col-span-1 col-start-1 row-start-1 min-[701px]:col-span-8 min-[1280px]:col-span-10"
            }
          >
            <ProjectWork
              key={projectId}
              tasks={taskPanel}
              artifacts={artifactLibrary}
              tests={tests}
              activity={activityPanel}
            >
              <FlowChooser projectId={projectId} />
            </ProjectWork>
          </div>
          {!focusedWork && (
            <>
              <div
                className={
                  "project-discussion-column min-w-0 max-w-full col-span-full col-start-1 row-start-2 min-[701px]:col-span-8 min-[1280px]:col-span-10"
                }
              >
                {discussion}
              </div>
              <div
                className={
                  "project-sidebar grid gap-2 min-w-0 max-w-full overflow-hidden content-start [&_.project-settings]:mb-0 col-span-1 col-start-1 row-start-3 min-[701px]:row-span-2 min-[701px]:col-span-4 min-[701px]:col-start-9 min-[701px]:row-start-1 min-[1280px]:col-span-2 min-[1280px]:col-start-11"
                }
              >
                {sidebar}
              </div>
            </>
          )}
        </div>
      )}
    </Workspace>
  );
}
