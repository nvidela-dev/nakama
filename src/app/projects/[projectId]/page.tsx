import { ArtifactLibrary } from "@/components/artifact-library";
import { artifactService } from "@/lib/artifacts";
import { taskService } from "@/lib/tasks";
import { TaskList } from "@/components/task-list";
import { ProjectWork } from "@/components/project-work";
import { invitationCandidates } from "@/lib/invitation-candidates";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { ProjectError, projectService } from "@/lib/projects";
import { AccessButton, InviteForm } from "@/components/forms";
import { guidanceService } from "@/lib/guidance";
import { FlowChooser } from "@/components/guidance";
import { ProjectSettings } from "@/components/project-settings";
import { Discussion } from "@/components/discussion";
import { ActivityFeed } from "@/components/activity-feed";
import { collaborationService } from "@/lib/collaboration";
import { Journey } from "@/components/journey";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ stage?: string; node?: string; commentsBefore?: string; comment?: string; activityBefore?: string }>;
}) {
  const t = await getT();
  const person = await actor();
  const { projectId } = await params;
  const service = projectService(database());
  const query = await searchParams;
  let project, people, guidance, comments, activity, tasks, artifacts;
  let history: Awaited<
    ReturnType<ReturnType<typeof guidanceService>["history"]>
  > = [];
  try {
    [project, people, guidance, history, comments, activity, tasks, artifacts] = await Promise.all([
      service.get(person, projectId),
      service.people(person, projectId),
      guidanceService(database()).get(person, projectId),
      query.node ? guidanceService(database()).history(person, projectId, query.node) : Promise.resolve([]),
      collaborationService(database()).comments(person, projectId, { stageId: query.stage, nodeId: query.node }, query.commentsBefore, query.comment),
      collaborationService(database()).activity(person, projectId, query.activityBefore),
      taskService(database()).list(person, projectId),
      artifactService(database()).list(person, projectId),
    ]);
  } catch (error) {
    if (error instanceof ProjectError) notFound();
    throw error;
  }
  const artifactLibrary=<ArtifactLibrary items={artifacts} projects={[{id:projectId,name:project.name}]} projectId={projectId} stages={guidance?.flow.stages.map(({id,name})=>({id,name}))??[]} stageId={query.stage}/>;
  const candidates = project.role === "owner" ? await invitationCandidates(person, projectId) : [];
  const selectedStage = guidance?.flow.stages.find((stage) => stage.id === query.stage);
  const selectedNode = selectedStage?.nodes.find((node) => node.id === query.node);
  const discussionLabel = selectedNode ? t(selectedNode.label) : selectedStage ? t(selectedStage.name) : t("Project discussion");
  function pageHref(kind: "commentsBefore" | "activityBefore", value?: string) {
    const params = new URLSearchParams();
    if (query.stage) params.set("stage", query.stage);
    if (query.node) params.set("node", query.node);
    if (query.commentsBefore && kind !== "commentsBefore") params.set("commentsBefore", query.commentsBefore);
    if (query.activityBefore && kind !== "activityBefore") params.set("activityBefore", query.activityBefore);
    if (value) params.set(kind, value);
    return `/projects/${projectId}${params.size ? `?${params}` : ""}`;
  }
  const sidebar = (
<>
        <aside className="panel">
          <div className="project-members">
          <h2>{t("Members")} <span className="count">{people.members.length}</span></h2>
          <ul className="people-list">
            {people.members.map((m) => (
              <li key={m.user_id}>
                <div>
                  <strong>
                    {m.user_id === person.userId ? t("You") : m.display_name}
                  </strong>
                  <small>{t(m.role)}</small>
                </div>
                {project.role === "owner" && m.role === "member" && (
                  <AccessButton
                    projectId={projectId}
                    id={m.user_id}
                    operation="remove"
                  />
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
                          <AccessButton
                            projectId={projectId}
                            id={inv.id}
                            operation="revoke"
                          />
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
          <ActivityFeed projectId={projectId} activity={activity} flow={guidance?.flow} open={!query.stage || !!query.activityBefore} olderHref={activity.next ? pageHref("activityBefore", activity.next) : undefined} latestHref={query.activityBefore ? pageHref("activityBefore") : undefined} />
        </aside>
      {project.role === "owner" && <ProjectSettings
        projectId={projectId} name={project.name} description={project.description}
        contentRevision={guidance?.contentRevision ?? 0}
      />}
        </>
  );
  const discussion = (
<Discussion key={`${projectId}:${query.stage ?? "project"}:${query.node ?? "stage"}`} projectId={projectId} target={{ stageId: query.stage, nodeId: query.node }} label={discussionLabel} comments={comments} userId={person.userId} owner={project.role === "owner"} olderHref={comments.next ? pageHref("commentsBefore", comments.next) : undefined} latestHref={query.commentsBefore || query.comment ? pageHref("commentsBefore") : undefined} />
  );
  return (
    <main id="main" className="workspace">
      <div className="page-heading project-heading">
        <div className="project-heading-line">
          <Link className="back-link" href="/projects">{t("← Your projects")}</Link>
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
          tasks={<TaskList projectId={projectId} initial={tasks} />} artifacts={artifactLibrary}
        />
      ) : (
        <div className="workspace-columns project-capture-workspace has-discussion">
          <div className="project-working-column">
            <ProjectWork tasks={<TaskList projectId={projectId} initial={tasks} />} artifacts={artifactLibrary}>
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
