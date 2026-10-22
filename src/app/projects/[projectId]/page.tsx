import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { ProjectError, projectService } from "@/lib/projects";
import { AccessButton, InviteForm } from "@/components/forms";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const person = await actor();
  const { projectId } = await params;
  const service = projectService(database());
  let project, people;
  try {
    project = await service.get(person, projectId);
    people = await service.people(person, projectId);
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
        <section className="panel">
          <span className="eyebrow">THE FIRST STEP</span>
          <h2>Your idea has a home.</h2>
          <p>Bring a friend aboard, or let the thought settle for a moment.</p>
          <p className="muted">
            Guided stages are the next part of this workspace taking shape.
          </p>
        </section>
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
