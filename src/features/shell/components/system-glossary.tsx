import Link from "next/link";
import type { Metadata } from "next";
import {
  ProjectStateValues,
  NodeStatusValues,
  TaskStatusValues,
  ArtifactStatusValues,
} from "@/shared/contracts/database.generated";
import { glossary, glossaryGroups } from "@/features/shell/glossary";
import { getWikiT as getT } from "@/features/shell/wiki-i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Glossary") };
}

export default async function GlossaryPage() {
  const t = await getT();
  const states = [
    ["Project state", ProjectStateValues.join(" · ")],
    ["Node status", NodeStatusValues.join(" · ")],
    ["Stage status", "not_started · in_progress · reviewed"],
    ["Task status", TaskStatusValues.join(" · ")],
    ["Artifact readiness", ArtifactStatusValues.join(" · ")],
  ] as const;
  return (
    <main
      id="main"
      className={
        "shell-glossary mx-auto max-w-300 px-5 py-6 text-[12px] leading-normal wrap-anywhere"
      }
    >
      <header>
        <Link className="text-lime" href="/wiki">
          ← {t("Back to the wiki")}
        </Link>
        <p className={"eyebrow"}>{t("System language")}</p>
        <h1 className="my-2 text-[28px]">{t("Glossary")}</h1>
        <p className="my-2">{t("Terms, contracts, and state semantics")}</p>
        <p className="my-2">
          {t(
            "This reference defines the language used in Nakama. Code identifiers are shown verbatim; translations change labels, never stored values.",
          )}
        </p>
      </header>
      <nav className="flex flex-wrap gap-3 py-3" aria-label={t("Glossary")}>
        {glossaryGroups.map((group) => (
          <a key={group.id} href={`#group-${group.id}`}>
            {t(group.title)}
          </a>
        ))}
        <a className="inline-block py-1 text-lime" href="#states">
          {t("State contracts")}
        </a>
      </nav>
      {glossaryGroups.map((group) => (
        <section key={group.id} id={`group-${group.id}`} aria-labelledby={`heading-${group.id}`}>
          <h2 className="mt-5 mb-2 text-base" id={`heading-${group.id}`}>
            {t(group.title)}
          </h2>
          <p className="my-2">{t(group.description)}</p>
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th className="w-[24%] border-b border-line p-2 text-left align-top" scope="col">
                  {t("Term / code")}
                </th>
                <th className="w-[24%] border-b border-line p-2 text-left align-top" scope="col">
                  {t("Definition and usage")}
                </th>
              </tr>
            </thead>
            <tbody>
              {group.terms.map((id) => {
                const entry = glossary.find((entry) => entry.id === id)!;
                return (
                  <tr key={entry.id} id={entry.id}>
                    <th
                      className="w-[24%] border-b border-line p-2 text-left align-top"
                      scope="row"
                    >
                      <a className="inline-block py-1 text-lime" href={`#${entry.id}`}>
                        {t(entry.term)}
                      </a>
                      <code className="text-[11px]">{entry.code}</code>
                    </th>
                    <td className="border-b border-line p-2 align-top">{t(entry.definition)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
      <section id="states">
        <h2 className="mt-5 mb-2 text-base">{t("State contracts")}</h2>
        <p className="my-2">
          {t(
            "Independent state machines: answering a node, completing a task, reviewing a stage, and preparing an artifact never imply each other.",
          )}
        </p>
        <dl className="my-2">
          {states.map(([name, values]) => (
            <div key={name} className="grid grid-cols-[1.05fr_1fr] border-b border-line py-1">
              <dt className="font-semibold">{t(name)}</dt>
              <dd className="m-0">
                <code className="text-[11px]">{values}</code>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h2 className="mt-5 mb-2 text-base">{t("Naming rules")}</h2>
        <p className="my-2">
          {t(
            "Use the canonical noun in new code and interface labels. Preserve stable IDs, persisted enum values, URL parameters, and interchange contracts when changing display text.",
          )}
        </p>
        <p className="my-2">
          {t(
            "Authorization is project-scoped. This page contains only system definitions and reads no private project records.",
          )}
        </p>
      </section>
    </main>
  );
}
