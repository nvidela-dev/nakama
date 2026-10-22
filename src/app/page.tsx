import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { authConfigured } from "@/lib/auth";
export default async function Home() {
  const t = await getT();
  return (
    <main id="main" className="landing">
      <section className="hero">
        <div className="eyebrow">
          <span /> {t("A LITTLE HARBOR FOR BIG WHAT-IFS")}{" "}
        </div>
        <h1>
          {t("Some ideas need")} <br />
          {t("a little")} <em>{t("company.")}</em>
        </h1>
        <p className="hero-copy">
          {t("The late-night thought. The “we should make this.”")} <br />
          {t("Give it a home, bring your people, and see where it goes.")}{" "}
        </p>
        <div className="hero-actions">
          {authConfigured() ? (
            <Link className="button" href="/projects">
              {t("Start with a spark ↗")}{" "}
            </Link>
          ) : (
            <Link className="button" href="/preview">
              {t("Explore a sample path ↗")}{" "}
            </Link>
          )}
          <span>{t("No perfect plan required.")}</span>
        </div>
        <div className="hero-note">
          <span aria-hidden="true">✦</span>{" "}
          {t("Something useful. Something weird. Something just for fun.")}{" "}
        </div>
      </section>
      <section
        className="map-scene"
        aria-label={t("Illustration of an idea growing through small steps")}
      >
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <span className="map-coordinate">
          {t("UNEXPLORED / FULL OF POSSIBILITY")}
        </span>
        <div className="floating-note note-one">
          <span>{t("01 / THE SPARK")}</span>
          <strong>{t("A tiny radio play")}</strong>
          <p>{t("“What if we made it together?”")}</p>
          <div className="avatars">
            <i>M</i>
            <i>J</i>
            <i>+1</i>
            <small>{t("Your kind of crew")}</small>
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
          <span className="status-dot" /> {t("One small experiment")} <br />
          <small>{t("Let's try a one-minute scene.")}</small>
        </div>
        <span className="compass" aria-hidden="true">
          N<br />✧
        </span>
        <span className="scene-caption">
          {t("A little direction. Room to wander.")}{" "}
        </span>
      </section>
      <section id="how-it-works" className="how">
        <div>
          <span className="eyebrow">
            {t("FROM “WHAT IF” TO “WE MADE THIS”")}
          </span>
          <h2>{t("You don't need all the answers.")}</h2>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <h3>{t("Catch the thought.")}</h3>
            <p>{t("A name and a few words. That's enough to begin.")}</p>
          </article>
          <article>
            <span>02</span>
            <h3>{t("Find your crew.")}</h3>
            <p>
              {t(
                "Invite different friends to different ideas. Keep each little world your own.",
              )}{" "}
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>{t("Try a small thing.")}</h3>
            <p>
              {t(
                "A helpful question, a rough experiment, a new discovery. Even a “no” moves you forward.",
              )}{" "}
            </p>
          </article>
        </div>
      </section>
      <section className="closing-note">
        <span>✳</span>
        <p>
          {t("A venture with a purpose.")} <br />
          {t("A project with no purpose but joy.")} <br />
          <strong>{t("There's room for both.")}</strong>
        </p>
        {!authConfigured() && (
          <small>
            {t(
              "Our harbor is taking shape. Private workspaces will open when sign-in is connected.",
            )}{" "}
          </small>
        )}
      </section>
    </main>
  );
}
