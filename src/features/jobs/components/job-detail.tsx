import Link from "next/link";
import { getT } from "@/shared/i18n/server";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { JobForm } from "./job-form";
import { availabilityLabels, jobStages, jobEvents, jobDate, sourceLink } from "../model";
import type { JobDetailData } from "../schemas";
const panel = "grid content-start gap-3 rounded-lg border border-line bg-panel p-4";
export async function JobDetail({
  data,
  back,
  linearEnabled,
}: {
  data: JobDetailData;
  back: string;
  linearEnabled: boolean;
}) {
  const t = await getT();
  const { lead, events, observations } = data;
  const url = sourceLink(lead.url);
  return (
    <main id="main" className="mx-auto grid w-full max-w-6xl gap-5 p-4 lg:px-8">
      <nav>
        <Link href={back}>← {t("Jobs and interviews")}</Link>
      </nav>
      <header className="grid gap-1">
        <span className="text-sm text-muted">{lead.company}</span>
        <h1 className="text-3xl font-semibold">{lead.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>{t(availabilityLabels[lead.availability])}</span>
          {url && (
            <a href={url} target="_blank" rel="noreferrer">
              {t("Open source listing")} ↗
            </a>
          )}
        </div>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="text-lg font-semibold">{t("Role plan")}</h2>
          <JobForm
            revision={lead.revision}
            canPursue={!lead.stage}
            operation="plan"
            id={lead.id}
            submit={lead.stage ? "Save plan" : "Save role plan"}
          >
            <Input type="hidden" name="revision" value={lead.revision} />
            <label className="grid gap-1">
              {t("Board stage")}
              <Select aria-label={t("Board stage")} name="stage" defaultValue={lead.stage ?? ""}>
                <option value="">{t("Backlog only")}</option>
                {Object.entries(jobStages).map(([v, label]) => (
                  <option key={v} value={v}>
                    {t(label)}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              {t("Next action")}
              <Input name="next_action" maxLength={2000} defaultValue={lead.next_action} />
            </label>
            <label>
              {t("Follow-up date")}
              <Input type="date" name="follow_up" defaultValue={lead.follow_up ?? ""} />
            </label>
          </JobForm>
        </section>
        <section className={panel}>
          <h2 className="text-lg font-semibold">{t("Log an event")}</h2>
          <JobForm operation="event" id={lead.id} submit="Record event">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                {t("Event")}
                <Select aria-label={t("Event")} name="kind" defaultValue="note">
                  {Object.entries(jobEvents).map(([v, label]) => (
                    <option key={v} value={v}>
                      {t(label)}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                {t("Date it happened")}
                <Input
                  type="date"
                  required
                  name="occurred_on"
                  max={jobDate()}
                  defaultValue={jobDate()}
                />
              </label>
            </div>
            <label>
              {t("What happened?")}
              <Textarea name="detail" rows={2} maxLength={8000} required />
            </label>
            <label>
              {t("What to practice or do differently")}
              <Textarea name="practice" rows={2} maxLength={4000} />
            </label>
          </JobForm>
        </section>
        <section className={panel}>
          <h2 className="text-lg font-semibold">{t("Application and interview history")}</h2>
          {!events.length && <p className="text-muted">{t("No events recorded yet.")}</p>}
          <ol className="grid gap-3">
            {events.map((e, i) => (
              <li key={i} className="border-l-2 border-line pl-3">
                <p className="font-semibold">
                  {t(jobEvents[e.kind])}{" "}
                  <time className="text-xs font-normal text-muted">{e.occurred_on}</time>
                </p>
                <p className="whitespace-pre-wrap wrap-anywhere">{e.detail}</p>
                {e.practice && (
                  <p className="mt-1 whitespace-pre-wrap wrap-anywhere">
                    <strong>{t("Practice")}</strong> · {e.practice}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
        <section className={panel}>
          <h2 className="text-lg font-semibold">{t("Source evidence")}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {[
              ["Date found", lead.found_on],
              ["Reported discovery", lead.first_seen_raw],
              ["Last source check", lead.last_checked],
              ["Employer type", lead.company_type],
              ["Contract terms", lead.employment],
              ["Startup", lead.startup === null ? null : t(lead.startup ? "Yes" : "No")],
              ["Relevance", lead.relevance],
            ].map(([label, v]) => (
              <div className="contents" key={label}>
                <dt className="text-muted">{t(label!)}</dt>
                <dd className="wrap-anywhere">{v || t("Unknown")}</dd>
              </div>
            ))}
          </dl>
          {observations.length > 0 && (
            <details>
              <summary className="cursor-pointer">
                {t("Observations")} ({observations.length})
              </summary>
              <ol className="mt-2 grid gap-3">
                {observations.map((o, i) => {
                  const href = sourceLink(o.source_url);
                  return (
                    <li key={i} className="border-t border-line pt-2 text-sm">
                      <span className="text-muted">
                        {o.observed_date ?? t("Unknown date")} ·{" "}
                        {t(o.historical ? "Historical" : "Source observation")}
                      </span>
                      <p>{o.status_observed}</p>
                      <p>{o.relevance || o.classification_evidence}</p>
                      {o.evidence_text && (
                        <details>
                          <summary className="cursor-pointer">{t("Read source notes")}</summary>
                          <p className="whitespace-pre-wrap wrap-anywhere">{o.evidence_text}</p>
                        </details>
                      )}
                      {href && (
                        <a href={href} rel="noreferrer" target="_blank">
                          {t("View source")} ↗
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
            </details>
          )}
        </section>
        {(linearEnabled || lead.linear_url) && (
          <section className={panel}>
            <h2 className="text-lg font-semibold">{t("Linear task")}</h2>
            {lead.linear_url ? (
              <a href={lead.linear_url} rel="noreferrer" target="_blank">
                {t("Open Linear task")} ↗
              </a>
            ) : (
              <JobForm operation="linear" id={lead.id} submit="Create private Linear task">
                <label>
                  {t("Task title to share")}
                  <Input name="task_title" maxLength={160} required />
                </label>
                <p className="text-sm text-muted">
                  {t("Only this title is sent to the configured private team.")}
                </p>
              </JobForm>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
