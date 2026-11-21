import Link from "next/link";
import { notFound } from "next/navigation";
import { ownerJobs } from "@/features/jobs/server/connection";
import { linearJobsConfigured } from "@/features/jobs/server/linear";
import { JobDetail } from "@/features/jobs/components/job-detail";
import { JobForm } from "@/features/jobs/components/job-form";
import { availabilityLabels, jobStages, sourceLink } from "@/features/jobs/model";
import { getT } from "@/shared/i18n/server";
import { Button } from "@/shared/ui/button";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { ProjectError } from "@/shared/contracts/errors";

export async function generateMetadata() {
  return { title: (await getT())("Jobs and interviews") };
}
type Params = Record<string, string | string[] | undefined>;
export default async function JobsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const jobs = await ownerJobs();
  const [params, t] = await Promise.all([searchParams, getT()]);
  const pick = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const board = pick("view") === "board";
  const filters = {
    query: pick("q"),
    availability: pick("availability"),
    employer: pick("employer"),
    contract: pick("contract"),
    startup: pick("startup"),
    source: pick("source"),
    board,
    page: Math.max(1, parseInt(pick("page"), 10) || 1),
  };
  function path(changes: Record<string, string> = {}) {
    const p = new URLSearchParams();
    for (const key of [
      "view",
      "q",
      "availability",
      "employer",
      "contract",
      "startup",
      "source",
      "page",
    ]) {
      const v = pick(key);
      if (v) p.set(key, v);
    }
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return "/jobs" + (p.size ? "?" + p.toString() : "");
  }
  if (pick("role")) {
    let data;
    try {
      data = await jobs.detail(pick("role"));
    } catch (e) {
      if (e instanceof ProjectError) notFound();
      throw e;
    }
    return (
      <JobDetail
        key={data.lead.id}
        data={data}
        back={path()}
        linearEnabled={linearJobsConfigured()}
      />
    );
  }
  const { rows, total, page } = await jobs.browse(filters);
  const last = Math.ceil(total / 40);
  const filtering = [
    filters.query,
    filters.availability,
    filters.source,
    filters.employer,
    filters.contract,
    filters.startup,
  ].some(Boolean);
  const filterClass = "grid gap-1 text-xs text-muted";
  return (
    <main
      id="main"
      className="mx-auto grid w-full max-w-[1500px] min-w-0 content-start gap-5 p-4 lg:px-8 lg:py-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{t("Jobs and interviews")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(board ? "{count} roles on your board" : "{count} leads", { count: total })}
          </p>
        </div>
        <details className="min-w-44 rounded-lg border border-line bg-panel px-3 py-2">
          <summary className="cursor-pointer font-medium">{t("Add job lead")}</summary>
          <div className="mt-3">
            <JobForm operation="add" submit="Save lead">
              <label>
                {t("Company")}
                <Input name="company" required maxLength={200} />
              </label>
              <label>
                {t("Role title")}
                <Input name="title" required maxLength={250} />
              </label>
              <label>
                {t("Source URL")}
                <Input name="url" type="url" maxLength={2000} />
              </label>
              <label>
                {t("Relevance")}
                <Textarea name="relevance" maxLength={2000} rows={2} />
              </label>
            </JobForm>
          </div>
        </details>
      </header>
      <nav className="flex gap-2 border-b border-line" aria-label={t("Job views")}>
        {[
          [false, "Leads backlog"],
          [true, "Active roles"],
        ].map(([active, label]) => (
          <Link
            key={String(label)}
            aria-current={board === active ? "page" : undefined}
            className={
              board === active
                ? "border-b-2 border-lime px-3 py-2 font-semibold"
                : "px-3 py-2 text-muted"
            }
            href={path({ view: active ? "board" : "", page: "" })}
          >
            {t(String(label))}
          </Link>
        ))}
      </nav>
      <form action="/jobs" method="get" className="flex flex-wrap items-end gap-2">
        {board && <Input type="hidden" name="view" value="board" />}
        <label className={filterClass + " min-w-48 grow"}>
          {t("Search roles")}
          <Input name="q" type="search" defaultValue={filters.query} maxLength={250} />
        </label>
        {(
          [
            ["source", "Source", [["linkedin", "LinkedIn"]]],
            ["availability", "Availability", Object.entries(availabilityLabels)],
            [
              "employer",
              "Employer type",
              [
                ["direct", "Product / direct"],
                ["agency", "Consultancy / intermediary"],
                ["unknown", "Unknown"],
              ],
            ],
            [
              "startup",
              "Startup",
              [
                ["true", "Yes"],
                ["false", "No"],
                ["unknown", "Unknown"],
              ],
            ],
          ] as [string, string, string[][]][]
        ).map(([name, label, options]) => (
          <label className={filterClass} key={name}>
            {t(label)}
            <Select aria-label={t(label)} name={name} defaultValue={pick(name)}>
              <option value="">{t("All")}</option>
              {options.map(([value, caption]) => (
                <option key={value} value={value}>
                  {t(caption!)}
                </option>
              ))}
            </Select>
          </label>
        ))}
        <label className={filterClass + " max-w-52"}>
          {t("Contract terms")}
          <Input name="contract" defaultValue={filters.contract} maxLength={100} />
        </label>
        <Button type="submit" variant="secondary">
          {t("Apply filters")}
        </Button>
        {filtering && <Link href={board ? "/jobs?view=board" : "/jobs"}>{t("Clear filters")}</Link>}
      </form>
      {board ? (
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Object.entries(jobStages).map(([stage, label]) => {
            const cards = rows.filter((r) => r.stage === stage);
            return (
              <section
                key={stage}
                aria-label={t(label)}
                className="rounded-lg border border-line bg-panel p-3"
              >
                <h2 className="mb-3 flex justify-between font-semibold">
                  {t(label)} <span className="text-muted">{cards.length}</span>
                </h2>
                <ul className="grid gap-2">
                  {cards.map((r) => (
                    <li className="rounded-md border border-line p-3" key={r.id}>
                      <Link
                        className="font-semibold wrap-anywhere"
                        prefetch={false}
                        href={path({ role: r.id })}
                      >
                        {r.title}
                      </Link>
                      <p className="text-sm text-muted">{r.company}</p>
                      {r.next_action && (
                        <p className="mt-2 text-sm wrap-anywhere">{r.next_action}</p>
                      )}
                      {r.follow_up && <time className="text-xs">{r.follow_up}</time>}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-lg border border-line">
          <table
            aria-label={t("Leads backlog")}
            className="w-full border-collapse text-left text-sm"
          >
            <thead className="bg-panel text-muted">
              <tr>
                {[
                  "Role",
                  "Source",
                  "First recorded",
                  "Last source check",
                  "Availability",
                  "Relevance",
                ].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = sourceLink(r.url);
                return (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="min-w-52 px-3 py-2">
                      <Link className="font-semibold" prefetch={false} href={path({ role: r.id })}>
                        {r.title}
                      </Link>
                      <p className="text-muted">
                        {r.company}
                        {r.stage ? " · " + t(jobStages[r.stage]) : ""}
                      </p>
                    </td>
                    <td className="max-w-52 px-3 py-2 wrap-anywhere">
                      {href ? (
                        <a href={href} rel="noreferrer" target="_blank">
                          {new URL(href).hostname} ↗
                        </a>
                      ) : (
                        t("Unknown")
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{r.first_observed ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{r.last_checked ?? "—"}</td>
                    <td className="px-3 py-2">{t(availabilityLabels[r.availability])}</td>
                    <td className="max-w-72 px-3 py-2">
                      <span className="line-clamp-2">{r.relevance ?? "—"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!total && (
        <p className="text-muted">
          {t(
            board && !filtering
              ? "Choose a lead and move it to Pursuing to start your board."
              : "No matching leads.",
          )}
        </p>
      )}
      {!board && last > 1 && (
        <nav aria-label={t("Pagination")} className="flex items-center gap-4">
          {page > 1 && <Link href={path({ page: String(page - 1) })}>← {t("Previous")}</Link>}
          <span>{t("Page {page} of {total}", { page, total: last })}</span>
          {page < last && <Link href={path({ page: String(page + 1) })}>{t("Next")} →</Link>}
        </nav>
      )}
    </main>
  );
}
