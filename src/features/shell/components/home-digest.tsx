import Link from "next/link";
import { formatDate, translator, type Locale } from "@/shared/i18n/index";
import { Icon } from "@/shared/ui/icon";
import type { HomeActivityItem, HomeMetrics } from "../model";

const areas = {
  explorations: { label: "Explorations", icon: "compass", href: "/projects" },
  consultancy: { label: "Consultancy", icon: "consultancy", href: "/prospects?view=board" },
  jobs: { label: "Job Search", icon: "jobSearch", href: "/jobs?view=board" },
} as const;

function MetricCard({
  area,
  total,
  description,
  breakdown,
  locale,
}: {
  area: keyof typeof areas;
  total: number;
  description: string;
  breakdown: { label: string; count: number }[];
  locale: Locale;
}) {
  const t = translator(locale);
  const format = new Intl.NumberFormat(locale === "es" ? "es-UY" : "en-US");
  const { label, icon, href } = areas[area];
  return (
    <article className="min-w-0 rounded-xl border border-line bg-panel px-4 py-3.5 sm:px-5">
      <h3>
        <Link
          href={href}
          prefetch={false}
          className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 font-semibold focus-visible:outline-2 focus-visible:outline-lime hover:bg-[var(--theme-selected)]"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-bg text-lime">
            <Icon name={icon} />
          </span>
          <span className="min-w-0 flex-1 wrap-anywhere">{t(label)}</span>
          <Icon name="chevronRight" className="shrink-0 text-muted" />
        </Link>
      </h3>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
        <strong className="text-3xl leading-tight font-semibold tabular-nums">
          {format.format(total)}
        </strong>
        <p className="text-xs font-medium text-muted">{t(description)}</p>
      </div>
      {breakdown.length > 0 && (
        <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-xs">
          {breakdown.map(({ label, count }) => (
            <div
              key={label}
              className="flex min-w-0 items-baseline justify-between gap-2 rounded-md bg-bg px-2 py-1.5"
            >
              <dt className="min-w-0 wrap-anywhere text-muted">{t(label)}</dt>
              <dd className="m-0 font-semibold tabular-nums">{format.format(count)}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

export function HomeDigest({
  activity,
  metrics,
  locale,
}: {
  activity: HomeActivityItem[];
  metrics: HomeMetrics;
  locale: Locale;
}) {
  const t = translator(locale);
  const calendarDate = new Intl.DateTimeFormat(locale === "es" ? "es-UY" : "en-US", {
    dateStyle: "medium",
    timeZone: "America/Montevideo",
  });
  return (
    <main
      id="main"
      className="mx-auto grid w-full max-w-320 min-w-0 content-start gap-6 px-4 py-6 sm:px-6 lg:py-8"
    >
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("Home")}</h1>
        <p className="mt-1 text-muted">{t("Pick up where you left off across your workspace.")}</p>
      </header>
      <div className="grid min-w-0 items-start gap-6 min-[1130px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section aria-labelledby="home-workspace-overview" className="grid min-w-0 gap-3">
          <h2 id="home-workspace-overview" className="text-base font-semibold">
            {t("Workspace overview")}
          </h2>
          {metrics.jobs && (
            <MetricCard
              area="jobs"
              total={metrics.jobs.active}
              description="Active applications"
              breakdown={metrics.jobs.stages}
              locale={locale}
            />
          )}
          {metrics.consultancy && (
            <MetricCard
              area="consultancy"
              total={metrics.consultancy.active}
              description="Active in pipeline"
              breakdown={metrics.consultancy.stages}
              locale={locale}
            />
          )}
          <MetricCard
            area="explorations"
            total={metrics.explorations.active}
            description="Active explorations"
            breakdown={[
              { label: "With a flow", count: metrics.explorations.withFlow },
              { label: "Without a flow", count: metrics.explorations.withoutFlow },
              { label: "Parked", count: metrics.explorations.parked },
              { label: "Finished", count: metrics.explorations.finished },
            ]}
            locale={locale}
          />
        </section>
        <section aria-labelledby="home-recent-activity" className="grid min-w-0 gap-3">
          <h2 id="home-recent-activity" className="text-base font-semibold">
            {t("Recent activity")}
          </h2>
          {activity.length === 0 ? (
            <div className="rounded-xl border border-line bg-panel px-4 py-8 sm:px-5">
              <p className="font-medium">{t("No recent activity yet.")}</p>
              <p className="mt-1 text-muted">
                {t("Meaningful updates will appear here as work happens.")}
              </p>
            </div>
          ) : (
            <ol className="m-0 min-w-0 list-none rounded-xl border border-line bg-panel p-3 sm:p-4">
              {activity.map((item) => {
                const { label, icon } = areas[item.source];
                return (
                  <li
                    key={item.id}
                    className="relative min-w-0 pb-2 last:pb-0 before:pointer-events-none before:absolute before:top-6 before:-bottom-6 before:left-5 before:border-l-2 before:border-dotted before:border-line last:before:hidden"
                  >
                    <Link
                      href={item.href}
                      prefetch={false}
                      className="relative grid min-h-11 min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg p-1 hover:bg-[var(--theme-selected)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime"
                    >
                      <span className="mt-1 grid size-8 place-items-center rounded-full border border-line bg-bg text-lime">
                        <Icon name={icon} />
                      </span>
                      <span className="grid min-w-0 gap-1 py-1">
                        <span className="min-w-0 wrap-anywhere text-xs font-medium text-muted">
                          {t(label)} · {t(item.action)}
                        </span>
                        <span className="min-w-0 wrap-anywhere font-semibold text-ink">
                          {item.title}
                        </span>
                        <time
                          dateTime={item.occurredAt}
                          className="text-xs text-muted tabular-nums"
                        >
                          {item.dateOnly
                            ? calendarDate.format(new Date(item.occurredAt))
                            : formatDate(item.occurredAt, locale)}
                        </time>
                      </span>
                      <Icon name="chevronRight" className="mt-2.5 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
