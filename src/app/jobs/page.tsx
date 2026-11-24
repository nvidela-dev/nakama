import { RouteTabs } from "@/shared/navigation/route-tabs";
import { WorkspaceToolbar, workspaceFilterLabel } from "@/shared/navigation/workspace-toolbar";
import Link from "next/link";
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
  finishedStages,
  jobDate,
  jobPageSize,
  jobStages,
  originalStages,
  sourceLink,
} from "@/features/jobs/model";
import { getLocale, getT } from "@/shared/i18n/server";
import { formatDate } from "@/shared/i18n/index";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { ProjectError } from "@/shared/contracts/errors";
import { ToolbarDialog } from "@/shared/ui/toolbar-dialog";
import Loading from "./loading";

export async function generateMetadata() {
  return { title: (await getT())("Job Search") };
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
  const view = pick("view");
  const board = view === "board";
  const finished = view === "finished";
  const showBacklog = !board && !finished;
  const finishedStage = finished ? pick("stage") : "";
  const sort: JobSort = pick("sort") === "match" ? "match" : "date";
  const direction = pick("direction") === "asc" ? "asc" : "desc";
  const filters: JobFilters = {
    sort,
    direction,
    query: pick("q"),
    found: showBacklog ? pick("found") : "",
    availability: pick("availability"),
    employer: pick("employer"),
    contract: pick("contract"),
    startup: pick("startup"),
    source: pick("source"),
    board,
    finished,
    finishedStage,
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
      "stage",
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
  const [{ rows, total, page, matches }, locale] = await Promise.all([
    jobs.browse(filters, today),
    getLocale(),
  ]);
  const finishedOptions = finishedStages.filter(
    (stage) =>
      stage !== "closed" ||
      finishedStage === "closed" ||
      rows.some((row) => row.stage === "closed"),
  );
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
    finishedStage,
  ].some(Boolean);
  const filterClass = workspaceFilterLabel;
  return (
    <main
      id="main"
      className="mx-auto grid w-full max-w-[1500px] min-w-0 content-start gap-5 p-4 lg:px-8 lg:py-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sr-only">{t("Job Search")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(
              finished
                ? "{count} finished processes"
                : board
                  ? "{count} roles on your board"
                  : "{count} leads",
              { count: total },
            )}
          </p>
        </div>
      </header>
      <WorkspaceToolbar
        label={t("Job actions")}
        action="/jobs"
        applyLabel={t("Apply filters")}
        clear={
          filtering
            ? {
                href: path({
                  q: "",
                  found: "",
                  source: "",
                  availability: "",
                  employer: "",
                  contract: "",
                  startup: "",
                  stage: "",
                  page: "",
                }),
                label: t("Clear filters"),
              }
            : undefined
        }
        views={
          <RouteTabs
            label={t("Job views")}
            items={[
              {
                href: path({ view: "", stage: "", page: "" }),
                label: t("Leads backlog"),
                icon: "listTree",
                active: showBacklog,
              },
              {
                href: path({ view: "board", found: "", stage: "", page: "" }),
                label: t("Active roles"),
                icon: "board",
                active: board,
              },
              {
                href: path({ view: "finished", found: "", stage: "", page: "" }),
                label: t("Finished Processes"),
                icon: "answered",
                active: finished,
              },
            ]}
          />
        }
        actions={
          <ToolbarDialog label="Add job lead" icon="plus">
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
          </ToolbarDialog>
        }
      >
        {sort === "match" && <Input type="hidden" name="sort" value={sort} />}
        {direction === "asc" && <Input type="hidden" name="direction" value={direction} />}
        {(board || finished) && <Input type="hidden" name="view" value={view} />}
        <label className={filterClass + " min-w-48 grow"}>
          {t("Search roles")}
          <Input name="q" type="search" defaultValue={filters.query} maxLength={250} />
        </label>
        {finished && (
          <label className={filterClass}>
            {t("Outcome")}
            <Select aria-label={t("Outcome")} name="stage" defaultValue={finishedStage}>
              <option value="">{t("All")}</option>
              {finishedOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {t(jobStages[stage])}
                </option>
              ))}
            </Select>
          </label>
        )}
        {(
          [
            ...(showBacklog ? [["found", "Found", Object.entries(foundFilters)]] : []),
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
      </WorkspaceToolbar>
      {board ? (
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Object.entries(jobStages).map(([stage, label]) => {
            const cards = rows.filter((r) => r.stage === stage);
            if (finishedStages.some((finishedStage) => finishedStage === stage)) return null;
            if (!jobs.workflowReady && !originalStages.has(stage)) return null;
            if (jobs.workflowReady && !cards.length && stage === "offer") return null;
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
      ) : finished ? (
        <>
          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted"
            aria-label={t("Sort finished processes")}
          >
            {(
              [
                ["date", "Date finished"],
                ["match", "Résumé match"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={path({
                  sort: key,
                  direction: sort === key && direction === "desc" ? "asc" : "",
                  page: "",
                })}
                aria-current={sort === key ? "true" : undefined}
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 hover:bg-panel focus-visible:outline-2 focus-visible:outline-lime aria-[current=true]:font-semibold aria-[current=true]:text-ink"
              >
                {t(label)}
                {sort === key ? (
                  <>
                    <span aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span>
                    <span className="sr-only">
                      {t(direction === "asc" ? "Ascending" : "Descending")}
                    </span>
                  </>
                ) : null}
              </Link>
            ))}
          </nav>
          {rows.length > 0 && (
            <ul
              className="m-0 grid min-w-0 list-none gap-2 p-0"
              aria-label={t("Finished Processes")}
            >
              {rows.map((role) => {
                const match = matches.get(role.id);
                return (
                  <li key={role.id} className="min-w-0 rounded-lg border border-line bg-panel">
                    <Link
                      href={path({ role: role.id })}
                      prefetch={false}
                      className="flex min-h-11 min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg p-3 hover:bg-[var(--theme-selected)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime"
                    >
                      <span className="grid min-w-0 flex-1 basis-48 gap-0.5">
                        <span className="font-semibold wrap-anywhere">{role.title}</span>
                        <span className="text-sm text-muted wrap-anywhere">{role.company}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        {role.stage && (
                          <span className="rounded-md border border-line bg-bg px-2 py-0.5 font-medium">
                            {t(jobStages[role.stage])}
                          </span>
                        )}
                        {role.finished_at && (
                          <time dateTime={role.finished_at} className="text-xs text-muted">
                            {formatDate(role.finished_at, locale)}
                          </time>
                        )}
                        {sort === "match" && match?.status === "scored" && (
                          <span className="text-xs text-muted">
                            {t("Résumé match")} · {match.percent}%
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
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
            finished
              ? filtering
                ? "No finished processes match these filters."
                : "No finished processes yet."
              : board && !filtering
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
