import Link from "next/link";
import { authConfigured } from "@/lib/auth";
export default function Home() {
  return (
    <main id="main" className="landing">
      <section className="hero">
        <div className="eyebrow">
          <span /> A LITTLE HARBOR FOR BIG WHAT-IFS
        </div>
        <h1>
          Some ideas need
          <br />a little <em>company.</em>
        </h1>
        <p className="hero-copy">
          The late-night thought. The “we should make this.”
          <br />
          Give it a home, bring your people, and see where it goes.
        </p>
        <div className="hero-actions">
          {authConfigured() ? (
            <Link className="button" href="/projects">
              Start with a spark ↗
            </Link>
          ) : (
            <Link className="button" href="/preview">
              Explore a sample path ↗
            </Link>
          )}
          <span>No perfect plan required.</span>
        </div>
        <div className="hero-note">
          <span aria-hidden="true">✦</span> Something useful. Something weird.
          Something just for fun.
        </div>
      </section>
      <section
        className="map-scene"
        aria-label="Illustration of an idea growing through small steps"
      >
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <span className="map-coordinate">UNEXPLORED / FULL OF POSSIBILITY</span>
        <div className="floating-note note-one">
          <span>01 / THE SPARK</span>
          <strong>A tiny radio play</strong>
          <p>“What if we made it together?”</p>
          <div className="avatars">
            <i>M</i>
            <i>J</i>
            <i>+1</i>
            <small>Your kind of crew</small>
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
          <span className="status-dot" /> One small experiment
          <br />
          <small>Let's try a one-minute scene.</small>
        </div>
        <span className="compass" aria-hidden="true">
          N<br />✧
        </span>
        <span className="scene-caption">
          A little direction. Room to wander.
        </span>
      </section>
      <section id="how-it-works" className="how">
        <div>
          <span className="eyebrow">FROM “WHAT IF” TO “WE MADE THIS”</span>
          <h2>You don't need all the answers.</h2>
        </div>
        <div className="steps">
          <article>
            <span>01</span>
            <h3>Catch the thought.</h3>
            <p>A name and a few words. That's enough to begin.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Find your crew.</h3>
            <p>
              Invite different friends to different ideas. Keep each little
              world your own.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Try a small thing.</h3>
            <p>
              A helpful question, a rough experiment, a new discovery. Even a
              “no” moves you forward.
            </p>
          </article>
        </div>
      </section>
      <section className="closing-note">
        <span>✳</span>
        <p>
          A venture with a purpose.
          <br />A project with no purpose but joy.
          <br />
          <strong>There's room for both.</strong>
        </p>
        {!authConfigured() && (
          <small>
            Our harbor is taking shape. Private workspaces will open when
            sign-in is connected.
          </small>
        )}
      </section>
    </main>
  );
}
