import Link from "next/link";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { projectService } from "@/lib/projects";
import { CaptureForm } from "@/components/forms";
export const dynamic = "force-dynamic";
export default async function ProjectsPage() {
  const person = await actor();
  const projects = await projectService(database()).list(person);
  return (
    <main id="main" className="workspace">
      <div className="page-heading">
        <span className="eyebrow">YOUR LITTLE WORLDS</span>
        <h1>Room for another what-if.</h1>
        <p>Start small. Invite your people when you're ready.</p>
      </div>
      <div className="workspace-columns">
        <section className="project-list">
          <h2>
            Your projects <span className="count">{projects.length}</span>
          </h2>
          {projects.length ? (
            projects.map((p) => (
              <Link
                className="project-card"
                key={p.id}
                href={`/projects/${p.id}`}
              >
                <span className="eyebrow">
                  {p.role === "owner" ? "YOUR IDEA" : "WITH YOUR CREW"}{" "}
                  <span aria-hidden="true">↗</span>
                </span>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <small>Private project · {p.role}</small>
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">✳</span>
              <h3>Your first idea starts here.</h3>
              <p>
                It doesn't have to be impressive.
                <br />
                It just has to be yours.
              </p>
            </div>
          )}
        </section>
        <aside className="panel capture">
          <span className="eyebrow">A NEW BEGINNING</span>
          <h2>What's on your mind?</h2>
          <CaptureForm />
        </aside>
      </div>
    </main>
  );
}
