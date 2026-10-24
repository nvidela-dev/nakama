import { WikiVisuals } from "@/features/shell/components/wiki-visuals";
import type { Metadata } from "next";
import Link from "next/link";
import { wikiChapters } from "@/features/shell/wiki";
import { getWikiT as getT } from "@/features/shell/wiki-i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Nakama wiki") };
}

const diagramStyles = {
  sequence: "grid-cols-[1.05fr_1fr] max-[700px]:grid-cols-1",
  workspace: "grid-cols-[repeat(3,_1fr)] max-[700px]:grid-cols-1",
  hierarchy: "",
  cards: "grid-cols-[1.05fr_1fr] max-[700px]:grid-cols-1",
  situations: "",
} as const;

export default async function WikiPage() {
  const t = await getT();
  return (
    <main
      id="main"
      className={
        "shell-wiki mx-auto max-w-360 px-6 pt-8 pb-16 text-[13px] leading-relaxed wrap-anywhere max-[700px]:p-4"
      }
    >
      <header className={"shell-wiki-header max-w-300 mb-8"}>
        <p className={"eyebrow"}>{t("Nakama wiki")}</p>
        <h1 className="my-4 text-[28px] leading-tight">
          {t("Learn the system, one project at a time.")}
        </h1>
        <p className="my-2">
          {t(
            "Start here, follow the examples, then use the reference when you need precise definitions.",
          )}
        </p>
        <div className={"shell-wiki-actions flex items-center flex-wrap gap-5 my-5"}>
          <Link
            className={
              "button inline-flex rounded-lg bg-lime px-5 py-3 font-semibold text-dark focus-visible:outline-2 focus-visible:outline-offset-5 focus-visible:outline-lime"
            }
            href="/preview"
          >
            {t("Try the example project")}
          </Link>
          <Link className="text-lime" href="/projects">
            {t("Open your projects")}
          </Link>
        </div>
        <small className="block text-muted">
          {t(
            "The examples on this page are illustrative. They do not create projects or change your data.",
          )}
        </small>
      </header>
      <div className={"shell-wiki-layout flex items-start gap-5 max-[700px]:block"}>
        <nav
          className={
            "shell-wiki-index w-66.25 shrink-0 max-[700px]:w-full rounded-lg border border-line bg-panel p-4 "
          }
          aria-label={t("On this page")}
        >
          <strong>{t("On this page")}</strong>
          <ol className="my-3 list-decimal pl-5">
            {wikiChapters.map((chapter) => (
              <li className="py-1" key={chapter.id}>
                <a className="inline-block py-1 text-lime" href={`#${chapter.id}`}>
                  {t(chapter.title)}
                </a>
              </li>
            ))}
            <li>
              <a className="inline-block py-1 text-lime" href="#reference">
                {t("Reference library")}
              </a>
            </li>
          </ol>
          <Link className="text-lime" href="/wiki/glossary">
            {t("Glossary")} →
          </Link>
        </nav>
        <div className={"shell-wiki-chapters min-w-0 flex-1"}>
          {wikiChapters.map((chapter, index) => (
            <section
              className="mb-10 scroll-mt-6"
              key={chapter.id}
              id={chapter.id}
              aria-labelledby={`wiki-${chapter.id}`}
            >
              <header className={"shell-wiki-section-heading flex items-start gap-3.5 mb-4"}>
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-lime"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="mt-5 mb-2 text-[20px]" id={`wiki-${chapter.id}`}>
                    {t(chapter.title)}
                  </h2>
                  <p className="my-2">{t(chapter.intro)}</p>
                </div>
              </header>
              <WikiVisuals chapter={chapter.id} />
              {chapter.kind === "situations" ? (
                <div className={"shell-wiki-situations border-t border-line"}>
                  {chapter.cards.map((card) => (
                    <details className="border-b border-line py-2" key={card.title}>
                      <summary className="cursor-pointer py-2 text-lime font-semibold">
                        {t(card.title)}
                      </summary>
                      <p className="my-2">{t(card.body)}</p>
                    </details>
                  ))}
                </div>
              ) : (
                <ol
                  className={`shell-wiki-diagram grid list-none m-0 p-0 gap-3 ${diagramStyles[chapter.kind]}`}
                  aria-label={t(chapter.title)}
                >
                  {chapter.cards.map((card) => (
                    <li
                      className="relative min-w-0 rounded-lg border border-line bg-panel p-4"
                      key={card.title}
                    >
                      <h3 className="mb-2 text-[14px] font-semibold">{t(card.title)}</h3>
                      <p className="my-2">{t(card.body)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
          <section
            id="reference"
            className={"shell-wiki-reference rounded-lg border border-lime bg-panel p-6"}
          >
            <p className={"eyebrow"}>{t("Reference library")}</p>
            <h2 className="mt-5 mb-2 text-[20px]">{t("Continue with the reference")}</h2>
            <p className="my-2">
              {t(
                "Use the glossary to understand the exact model after you have tried the workflow. It distinguishes implemented records from concepts and future capabilities.",
              )}
            </p>
            <Link className="text-lime" href="/wiki/glossary">
              <strong>{t("Read the glossary")} →</strong>
            </Link>
            <p className="my-2">
              {t("Exact terms, code identifiers, state values, and naming rules.")}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
