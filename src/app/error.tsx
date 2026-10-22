"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="workspace narrow">
      <section className="panel">
        <h1>A small snag.</h1>
        <p>
          We couldn't load this part of your workspace. Please try again in a
          moment.
        </p>
        <button onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
