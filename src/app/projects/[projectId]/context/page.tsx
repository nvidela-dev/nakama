import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/ui/controls";
import Link from "next/link";
import { notFound } from "next/navigation";
import { actor } from "@/features/access/server/auth";
import { projectContext } from "@/features/projects/server/context-export";
import { ProjectError } from "@/shared/contracts/errors";
import { database } from "@/server/database/db";
import { getT } from "@/shared/i18n/server";

export const dynamic = "force-dynamic";

export default async function ContextPreview({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ part?: string; omit?: string; snapshot?: string }>;
}) {
  const [{ projectId }, query, person, t] = await Promise.all([
    params,
    searchParams,
    actor(),
    getT(),
  ]);
  let result;
  try {
    result = await projectContext(
      database(),
      person,
      projectId,
      Number(query.part ?? 1),
      query.omit,
    );
  } catch (error) {
    if (error instanceof ProjectError) notFound();
    throw error;
  }
  const base = "/projects/" + projectId + "/context";
  const opts = new URLSearchParams({ snapshot: result.revision, part: String(result.part) });
  if (query.omit) opts.set("omit", query.omit);
  const changed = query.snapshot && query.snapshot !== result.revision;
  return (
    <main id="main" className="mx-auto grid max-w-4xl gap-4 p-5">
      <Link href={"/projects/" + projectId}>{t("Back to project")}</Link>
      <h1 className="text-2xl font-semibold">{t("Project context")}</h1>
      <p>
        {t(
          "Review this project before sharing. Pasting or sending the downloaded Markdown shares its contents with the recipient.",
        )}
      </p>
      <form className="flex flex-wrap items-center gap-2" action={base}>
        <label>
          {t("Discussion")}{" "}
          <Select name="omit" defaultValue={query.omit === "discussion" ? "discussion" : ""}>
            <option value="">{t("Include discussion")}</option>
            <option value="discussion">{t("Omit discussion")}</option>
          </Select>
        </label>
        <Button variant="secondary" type="submit">
          {t("Update preview")}
        </Button>
      </form>
      {changed && (
        <p role="alert">
          {t("The project changed. Review this updated snapshot before downloading.")}
        </p>
      )}
      {result.omissions.length > 0 && (
        <p role="status">
          {t("Partial export. Omitted fields and sections appear in the manifest.")}
        </p>
      )}
      <nav aria-label={t("Export parts")} className="flex flex-wrap items-center gap-3">
        {result.part > 1 && (
          <Link
            prefetch={false}
            href={
              base +
              "?" +
              new URLSearchParams({ ...Object.fromEntries(opts), part: String(result.part - 1) })
            }
          >
            {t("Previous part")}
          </Link>
        )}
        <span>
          {t("Part")} {result.part} / {result.parts}
        </span>
        {result.part < result.parts && (
          <Link
            prefetch={false}
            href={
              base +
              "?" +
              new URLSearchParams({ ...Object.fromEntries(opts), part: String(result.part + 1) })
            }
          >
            {t("Next part")}
          </Link>
        )}
        <a className="underline" download href={base + "/download?" + opts}>
          {t("Download Markdown")}
        </a>
      </nav>
      <pre className="whitespace-pre-wrap wrap-anywhere rounded border border-line p-4 text-sm">
        {result.markdown}
      </pre>
    </main>
  );
}
