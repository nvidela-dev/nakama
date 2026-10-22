import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { ProjectError, projectService } from "@/lib/projects";
import { AccessButton, InviteForm } from "@/components/forms";
import { guidanceService } from "@/lib/guidance";
import { FlowChooser } from "@/components/guidance";
import { Journey } from "@/components/journey";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ stage?: string; node?: string }>;
}) {
  const person = await actor();
  const { projectId } = await params;
  const service = projectService(database());
  const query = await searchParams;
  let project, people, guidance;
  let history: Awaited<
    ReturnType<ReturnType<typeof guidanceService>["history"]>
  > = [];
  try {
    project = await service.get(person, projectId);
    people = await service.people(person, projectId);
    guidance = await guidanceService(database()).get(person, projectId);
    if (query.node)
      history = await guidanceService(database()).history(
        person,
        projectId,
        query.node,
      );
  } catch (error) {
    if (error instanceof ProjectError) notFound();
    throw error;
  }
  return (
    <main id="main" className="workspace">
      <Link className="back-link" href="/projects">
        ← Your projects
      </Link>
      <div className="page-heading">
        <span className="eyebrow">A LITTLE WORLD OF YOUR OWN</span>
        <h1>{project.name}</h1>
        <p className="preserve-lines">{project.description}</p>
      </div>
      <div className="workspace-columns">
        {guidance ? (
          <Journey
            projectId={projectId}
            guidance={guidance}
            stageId={query.stage}
            nodeId={query.node}
            history={history}
            names={Object.fromEntries(
              people.members.map((m) => [m.user_id, m.display_name]),
            )}
          />
        ) : (
          <FlowChooser projectId={projectId} />
        )}
        <aside className="panel">
          <h2>
            Your crew <span className="count">{people.members.length}</span>
          </h2>
          <ul className="people-list">
            {people.members.map((m) => (
              <li key={m.user_id}>
                <div>
                  <strong>
                    {m.user_id === person.userId ? "You" : m.display_name}
                  </strong>
                  <small>{m.role}</small>
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
              <h3>Bring someone aboard</h3>
              <InviteForm projectId={projectId} />
              <h3>Invitations</h3>
              {people.invitations.length ? (
                <ul className="people-list">
                  {people.invitations.map((inv) => (
                    <li key={inv.id}>
                      <div>
                        <strong>{inv.email}</strong>
                        <small>
                          {inv.revoked_at
                            ? "Revoked"
                            : inv.accepted_at
                              ? "Accepted"
                              : new Date(inv.expires_at) <= new Date()
                                ? "Expired"
                                : "Pending"}
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
                <p className="muted">No invitations yet.</p>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
