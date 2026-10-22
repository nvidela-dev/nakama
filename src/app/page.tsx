import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { authConfigured } from "@/lib/auth";
export default async function Home() {
  if (authConfigured() && (await auth()).isAuthenticated) redirect("/projects");
  const t = await getT();
  return (
    <main id="main" className="landing">
      <section className="hero">
        <div className="eyebrow">
          <span /> {t("PROJECT DEVELOPMENT AND COLLABORATION")}{" "}
        </div>
        <h1>
          {t("Develop projects")} <br />
          {t("with your")} <em>{t("team.")}</em>
        </h1>
        <p className="hero-copy">
          {t("Define the project. Evaluate assumptions.")} <br />
          {t("Plan the work and collaborate in one place.")}{" "}
        </p>
        <div className="hero-actions">
          {authConfigured() ? (
            <Link className="button" href="/projects">
              {t("Open projects")}{" "}
            </Link>
          ) : (
            <Link className="button" href="/preview">
              {t("View example")}{" "}
            </Link>
          )}
          <span>{t("Private project workspaces.")}</span>
        </div>
        <div className="hero-note">
          <span aria-hidden="true">✦</span>{" "}
          {t("Structured workflows for business and creative projects.")}{" "}
        </div>
      </section>
      <section
        className="map-scene"
        aria-label={t("Illustration of an idea growing through small steps")}
      >
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <span className="map-coordinate">{t("PROJECT OVERVIEW")}</span>
        <div className="floating-note note-one">
          <span>{t("01 / CONCEPT")}</span>
          <strong>{t("Audio production")}</strong>
          <p>{t("“Produce a short audio episode.”")}</p>
          <div className="avatars">
            <i>M</i>
            <i>J</i>
            <i>+1</i>
            <small>{t("Project members")}</small>
          </div>
        </div>
        <div className="map-path" />
        <div className="island">
          <div className="island-top">
            <div className="flag">
              <span>✳</span>
            </div>
            <span className="tree tree-one">✦</span>
            <span className="tree tree-two">✦</span>
            <span className="stone" />
          </div>
          <div className="island-base" />
        </div>
        <div className="floating-note note-two">
          <span className="status-dot" /> {t("Prototype")} <br />
          <small>{t("Record a one-minute sample.")}</small>
        </div>
        <span className="compass" aria-hidden="true">
          N<br />✧
        </span>
        <span className="scene-caption">
          {t("Stages, decisions, and revisions.")}{" "}
        </span>
      </section>
      <section id="how-it-works" className="how">
        <div>
          <span className="eyebrow">{t("FROM DEFINITION TO DELIVERY")}</span>
          <h2>{t("A structured project workflow.")}</h2>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <h3>{t("Define the project.")}</h3>
            <p>{t("Record the project's name, purpose, and scope.")}</p>
          </article>
          <article>
            <span>02</span>
            <h3>{t("Add collaborators.")}</h3>
            <p>{t("Manage membership independently for each project.")} </p>
          </article>
          <article>
            <span>03</span>
            <h3>{t("Test and develop.")}</h3>
            <p>
              {t("Record answers, test assumptions, and track decisions.")}{" "}
            </p>
          </article>
        </div>
      </section>
      <section className="closing-note">
        <span>✳</span>
        <p>
          {t("Business development.")} <br />
          {t("Creative production.")} <br />
          <strong>{t("Choose the workflow that fits your project.")}</strong>
        </p>
        {!authConfigured() && (
          <small>
            {t("Sign-in must be configured to use private projects.")}{" "}
          </small>
        )}
      </section>
    </main>
  );
}
