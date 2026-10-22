"use client";
import { useT } from "@/components/language";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useT();
  return (
    <main id="main" className="workspace narrow">
      <section className="panel">
        <h1>{t("A small snag.")}</h1>
        <p>
          {t(
            "We couldn't load this part of your workspace. Please try again in a moment.",
          )}{" "}
        </p>
        <button onClick={reset}>{t("Try again")}</button>
      </section>
    </main>
  );
}
