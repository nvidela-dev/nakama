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
      <details className="panel project-people-panel" open>
        <summary>
          <h2>
            {t("Members")} <span className="count">{people.members.length}</span>
          </h2>
        </summary>
        <div className="project-members">
          <ul className="people-list">
            {people.members.map((m) => (
              <li key={m.user_id}>
                <div>
                  <strong>{m.user_id === person.userId ? t("You") : m.display_name}</strong>
                  <small>{t(m.role)}</small>
                </div>
                {project.role === "owner" && m.role === "member" && (
                  <AccessButton projectId={projectId} id={m.user_id} operation="remove" />
                )}
              </li>
            ))}
          </ul>
          {project.role === "owner" && (
            <>
              <h3>{t("Invite member")}</h3>
              <InviteForm projectId={projectId} candidates={candidates} />
              <h3>{t("Invitations")}</h3>
              {people.invitations.length ? (
                <ul className="people-list">
                  {people.invitations.map((inv) => (
                    <li key={inv.id}>
                      <div>
                        <strong>{inv.email}</strong>
                        <small>
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
                <p className="muted">{t("No invitations yet.")}</p>
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
    <main id="main" className="workspace">
      <div className="page-heading project-heading">
        <div className="project-heading-line">
          <Link className="back-link" href="/projects">
            {t("← Your projects")}
          </Link>
          <h1>{project.name}</h1>
        </div>
        <p className="preserve-lines">{project.description}</p>
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
        <div className="workspace-columns project-capture-workspace has-discussion">
          <div className="project-working-column">
            <ProjectWork
              tasks={<TaskList projectId={projectId} initial={tasks} />}
              artifacts={artifactLibrary}
            >
              <FlowChooser projectId={projectId} />
            </ProjectWork>
          </div>
          <div className="project-discussion-column">{discussion}</div>
          <div className="project-sidebar">{sidebar}</div>
        </div>
      )}
    </main>
  );
}
