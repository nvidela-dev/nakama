import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { database } from "@/server/database/db";
import { experimentService } from "@/features/experiments/server/experiments";
import { reflectionKey } from "@/features/experiments/input";
import { reflectionPrompts } from "@/features/experiments/iteration";
import { ProjectError } from "@/shared/contracts/errors";
import { getT } from "@/shared/i18n/server";

export default async function ReflectionHistory({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; iterationId: string; prompt: string }>;
  searchParams: Promise<{ before?: string }>;
}) {
  const [{ projectId, iterationId, prompt }, query, person, t] = await Promise.all([
    params,
    searchParams,
    actor(),
    getT(),
  ]);
  const key = reflectionKey.safeParse(prompt);
  if (!key.success) notFound();
  let rows;
  try {
    rows = await experimentService(database()).reflectionHistory(
      person,
      projectId,
      iterationId,
      key.data,
      Number(query.before ?? 2147483647),
    );
  } catch (e) {
    if (e instanceof ProjectError) notFound();
    throw e;
  }
  const path = `/projects/${projectId}/lab/${iterationId}/reflections/${key.data}`;
  return (
    <main id="main" className="mx-auto max-w-3xl p-5 grid gap-3">
      <Link href={`/projects/${projectId}?view=tests`}>{t("Iterations")}</Link>
      <h1 className="text-2xl font-semibold">{t("Reflection history")}</h1>
      <h2>{t(reflectionPrompts[key.data])}</h2>
      <ol>
        {rows.slice(0, 25).map((r) => (
          <li key={r.revision} id={`revision-${r.revision}`} className="py-3 border-b border-line">
            <a
              className="text-sm underline"
              href={`${path}?before=${r.revision + 1}#revision-${r.revision}`}
            >
              #{r.revision}
            </a>{" "}
            · {r.author_name} · <time dateTime={r.created_at}>{r.created_at.slice(0, 10)}</time>
            <p className="whitespace-pre-wrap wrap-anywhere">{r.content}</p>
          </li>
        ))}
      </ol>
      {rows.length > 25 && (
        <Link href={`${path}?before=${rows[24]!.revision}`}>{t("Older revisions")}</Link>
      )}
    </main>
  );
}
