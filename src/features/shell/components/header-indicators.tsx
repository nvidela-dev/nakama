import Link from "next/link";
import { Icon } from "@/shared/ui/icon";
import { translator, type Locale } from "@/shared/i18n/index";
import type { HomeMetrics } from "../model";

export function HeaderIndicators({
  metrics,
  locale,
}: {
  metrics: HomeMetrics | null;
  locale: Locale;
}) {
  if (!metrics) return null;
  const t = translator(locale);
  const counts = new Intl.NumberFormat(locale === "es" ? "es-UY" : "en-US", {
    notation: "compact",
  });
  const entries = [
    {
      label: "Job Search",
      icon: "jobSearch",
      href: "/jobs?view=board",
      count: metrics.jobs?.active,
    },
    {
      label: "Consultancy",
      icon: "consultancy",
      href: "/prospects?view=board",
      count: metrics.consultancy?.active,
    },
    {
      label: "Explorations",
      icon: "compass",
      href: "/projects",
      count: metrics.explorations.active,
    },
  ] as const;
  return (
    <nav
      aria-label={t("Workspace activity indicators")}
      className="flex min-w-0 items-center gap-0.5 sm:gap-2"
    >
      {entries.map(({ label, icon, href, count }) =>
        count === undefined ? null : (
          <Link
            key={label}
            href={href}
            prefetch={false}
            className="flex min-h-11 w-11 shrink-0 items-center justify-center gap-0.5 rounded-lg px-1 text-xs font-semibold text-muted tabular-nums hover:bg-[var(--theme-selected)] hover:text-ink focus-visible:outline-2 focus-visible:outline-lime sm:w-auto sm:min-w-11 sm:gap-1.5 sm:px-2"
            aria-label={t("{area}: {count} active", { area: t(label), count: String(count) })}
            title={t("{area}: {count} active", { area: t(label), count: String(count) })}
          >
            <Icon name={icon} className="shrink-0 text-lime max-sm:size-3.5" />
            <span aria-hidden="true" className="truncate">
              {counts.format(count)}
            </span>
          </Link>
        ),
      )}
    </nav>
  );
}
