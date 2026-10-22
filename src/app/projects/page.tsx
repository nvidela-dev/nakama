import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { actor } from "@/lib/auth";
import { database } from "@/lib/db";
import { projectService } from "@/lib/projects";
import { CaptureForm } from "@/components/forms";
export const dynamic = "force-dynamic";
export default async function ProjectsPage() {
  const t = await getT();
  const person = await actor();
  const projects = await projectService(database()).list(person);
  return (
    <main id="main" className="workspace">
      <div className="page-heading">
        <span className="eyebrow">{t("YOUR LITTLE WORLDS")}</span>
        <h1>{t("Room for another what-if.")}</h1>
        <p>{t("Start small. Invite your people when you're ready.")}</p>
      </div>
      <div className="workspace-columns">
        <section className="project-list">
          <h2>
            {t("Your projects")}{" "}
            <span className="count">{projects.length}</span>
          </h2>
          {projects.length ? (
            projects.map((p) => (
              <Link
                className="project-card"
                key={p.id}
                href={`/projects/${p.id}`}
              >
                <span className="eyebrow">
                  {p.role === "owner" ? t("YOUR IDEA") : t("WITH YOUR CREW")}{" "}
                  <span aria-hidden="true">↗</span>
                </span>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <small>
                  {t("Private project ·")} {t(p.role)}
                </small>
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">✳</span>
              <h3>{t("Your first idea starts here.")}</h3>
              <p>
                {t("It doesn't have to be impressive.")} <br />
                {t("It just has to be yours.")}{" "}
              </p>
            </div>
          )}
        </section>
        <aside className="panel capture">
          <span className="eyebrow">{t("A NEW BEGINNING")}</span>
          <h2>{t("What's on your mind?")}</h2>
          <CaptureForm />
        </aside>
      </div>
    </main>
  );
}
