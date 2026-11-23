import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ownerJobs } from "@/features/jobs/server/connection";
import { linearJobsConfigured } from "@/features/jobs/server/linear";
import type { JobFilters, JobSort } from "@/features/jobs/schemas";
import { ResumeMeter } from "@/features/jobs/components/resume-meter";
import { JobDetail } from "@/features/jobs/components/job-detail";
import { JobForm } from "@/features/jobs/components/job-form";
import {
  foundFilters,
  weeksSinceFound,
  weekLabel,
  weekColors,
} from "@/features/jobs/discovery-weeks";
import {
  availabilityLabels,
  jobDate,
  jobPageSize,
  jobStages,
  sourceLink,
} from "@/features/jobs/model";
import { getT } from "@/shared/i18n/server";
import { Button } from "@/shared/ui/button";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { ProjectError } from "@/shared/contracts/errors";
import Loading from "./loading";

export async function generateMetadata() {
  return { title: (await getT())("Jobs and interviews") };
}
type Params = Record<string, string | string[] | undefined>;
export default async function JobsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [params, jobs, t] = await Promise.all([searchParams, ownerJobs(), getT()]);
  // A search, sort, or page change inside the same route needs its own pending boundary.
  return (
    <Suspense
      key={JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))}
      fallback={<Loading />}
    >
      <JobsContent jobs={jobs} params={params} t={t} />
    </Suspense>
  );
}

async function JobsContent({
  jobs,
  params,
  t,
}: {
  jobs: Awaited<ReturnType<typeof ownerJobs>>;
  params: Params;
  t: Awaited<ReturnType<typeof getT>>;
}) {
  const pick = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const board = pick("view") === "board";
  const sort: JobSort = pick("sort") === "match" ? "match" : "date";
  const direction = pick("direction") === "asc" ? "asc" : "desc";
  const filters: JobFilters = {
    sort,
    direction,
    query: pick("q"),
    found: board ? "" : pick("found"),
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
      "found",
      "sort",
      "direction",
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
  function sortableHeader(key: JobSort, label: string) {
    const active = sort === key;
    const ascendingNext = active && direction === "desc";
    return (
      <th
        scope="col"
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
        className="px-3 py-2 whitespace-nowrap"
      >
        <Link
          href={path({ sort: key, direction: ascendingNext ? "asc" : "", page: "" })}
          prefetch={false}
          className="inline-flex items-center gap-1 rounded font-semibold underline-offset-4 hover:underline focus-visible:underline"
        >
          {t(label)}{" "}
          <span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
        </Link>
      </th>
    );
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
  const today = jobDate();
  const { rows, total, page, matches } = await jobs.browse(filters, today);
  const last = Math.ceil(total / jobPageSize);
  const groups =
    sort === "date"
      ? Map.groupBy(rows, (r) => weeksSinceFound(r.found_on, today))
      : new Map([[null, rows]]);
  const filtering = [
    filters.query,
    filters.found,
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
                {t("Date found")}
                <Input name="found_on" type="date" required max={today} defaultValue={today} />
              </label>
              <label>
                {t("Source URL")}
                <Input name="url" type="url" maxLength={2000} />
              </label>
              <label>
                {t("Skills listed for the role")}
                <Textarea name="listed_skills" maxLength={2000} rows={2} />
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
      <Form action="/jobs" className="flex flex-wrap items-end gap-2">
        {sort === "match" && <Input type="hidden" name="sort" value={sort} />}
        {direction === "asc" && <Input type="hidden" name="direction" value={direction} />}
        {board && <Input type="hidden" name="view" value="board" />}
        <label className={filterClass + " min-w-48 grow"}>
          {t("Search roles")}
          <Input name="q" type="search" defaultValue={filters.query} maxLength={250} />
        </label>
        {(
          [
            ...(!board ? [["found", "Found", Object.entries(foundFilters)]] : []),
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
        {filtering && (
          <Link
            href={path({
              q: "",
              found: "",
              source: "",
              availability: "",
              employer: "",
              contract: "",
              startup: "",
              page: "",
            })}
          >
            {t("Clear filters")}
          </Link>
        )}
      </Form>
      {board ? (
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Object.entries(jobStages).map(([stage, label]) => {
            const cards = rows.filter((r) => r.stage === stage);
            if (!cards.length && (stage === "offer" || stage === "closed")) return null;
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
                      {r.waiting_since && (
                        <p className="text-xs text-muted">
                          {t("Waiting since")} · {r.waiting_since}
                        </p>
                      )}
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
                {sortableHeader("match", "Résumé match")}
                {sortableHeader("date", "Date found")}
                {["Role", "Source", "Last source check", "Availability", "Relevance"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            {Array.from(groups, ([weeks, leads]) => (
              <tbody key={weeks ?? "unknown"}>
                {sort === "date" && (
                  <tr>
                    <th
                      scope="rowgroup"
                      colSpan={7}
                      className="border-y border-line bg-panel px-3 py-2"
                    >
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${weekColors(weeks)}`}
                      >
                        {t(weekLabel(weeks), { count: weeks ?? 0 })}
                      </span>
                    </th>
                  </tr>
                )}
                {leads.map((r) => {
                  const href = sourceLink(r.url);
                  const age = weeksSinceFound(r.found_on, today);
                  return (
                    <tr key={r.id} className="border-t border-line align-top">
                      <td className="min-w-36 px-3 py-2">
                        <ResumeMeter match={matches.get(r.id)!} t={t} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                        {r.found_on ? (
                          <time
                            dateTime={r.found_on}
                            className={`inline-block rounded px-2 py-0.5 ${weekColors(age)}`}
                          >
                            {r.found_on}
                          </time>
                        ) : (
                          "—"
                        )}
                        {sort === "match" && (
                          <span className="block text-xs font-normal text-muted">
                            {t(weekLabel(age), { count: age ?? 0 })}
                          </span>
                        )}
                      </td>
                      <td className="min-w-52 px-3 py-2">
                        <Link
                          className="font-semibold"
                          prefetch={false}
                          href={path({ role: r.id })}
                        >
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
                      <td className="whitespace-nowrap px-3 py-2">{r.last_checked ?? "—"}</td>
                      <td className="px-3 py-2">{t(availabilityLabels[r.availability])}</td>
                      <td className="max-w-72 px-3 py-2">
                        <span className="line-clamp-2">{r.relevance ?? "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
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
