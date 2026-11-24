import Link from "next/link";
import { formatDate, translator, type Locale } from "@/shared/i18n/index";
import { Icon } from "@/shared/ui/icon";
import type { HomeActivityItem } from "../model";

const areas = {
  explorations: { label: "Explorations", icon: "compass" },
  consultancy: { label: "Consultancy", icon: "consultancy" },
  jobs: { label: "Job Search", icon: "jobSearch" },
} as const;

export function HomeDigest({ activity, locale }: { activity: HomeActivityItem[]; locale: Locale }) {
  const t = translator(locale);
  const calendarDate = new Intl.DateTimeFormat(locale === "es" ? "es-UY" : "en-US", {
    dateStyle: "medium",
    timeZone: "America/Montevideo",
  });
  return (
    <main
      id="main"
      className="mx-auto grid w-full max-w-240 min-w-0 content-start gap-5 px-4 py-6 sm:px-6 lg:py-8"
    >
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("Home")}</h1>
        <p className="mt-1 text-muted">{t("Pick up where you left off across your workspace.")}</p>
      </header>
      <section
        aria-labelledby="home-recent-activity"
        className="min-w-0 overflow-hidden rounded-xl border border-line bg-panel"
      >
        <h2
          id="home-recent-activity"
          className="border-b border-line px-4 py-3 text-base font-semibold sm:px-5"
        >
          {t("Recent activity")}
        </h2>
        {activity.length === 0 ? (
          <div className="px-4 py-8 sm:px-5">
            <p className="font-medium">{t("No recent activity yet.")}</p>
            <p className="mt-1 text-muted">
              {t("Meaningful updates will appear here as work happens.")}
            </p>
          </div>
        ) : (
          <ol className="m-0 list-none divide-y divide-line p-0">
            {activity.map((item) => {
              const { label, icon } = areas[item.source];
              return (
                <li key={item.id} className="min-w-0">
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="grid min-h-11 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-3 py-3 hover:bg-[var(--theme-selected)] focus-visible:bg-[var(--theme-selected)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime sm:px-5"
                  >
                    <span className="grid size-9 place-items-center rounded-lg border border-line bg-bg text-lime">
                      <Icon name={icon} />
                    </span>
                    <span className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3">
                      <span className="min-w-0 wrap-anywhere text-xs font-medium text-muted">
                        {t(label)} · {t(item.action)}
                      </span>
                      <span className="min-w-0 wrap-anywhere font-semibold text-ink sm:order-3 sm:col-span-2">
                        {item.title}
                      </span>
                      <time dateTime={item.occurredAt} className="text-xs text-muted tabular-nums">
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
    </main>
  );
}
