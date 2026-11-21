import type { ResumeMatch } from "../resume-match";
import type { createTranslator } from "@/shared/i18n/translate";

export function ResumeMeter({
  match,
  t,
}: {
  match: ResumeMatch;
  t: ReturnType<typeof createTranslator>;
}) {
  if (match.status !== "scored") {
    return (
      <span className="text-xs text-muted">
        {t(match.status === "no-profile" ? "Résumé unavailable" : "No recognized job skills")}
      </span>
    );
  }
  const coverage = t("{matched} of {total} listed skills", {
    matched: match.matched.length,
    total: match.total,
  });
  return (
    <details className="max-w-64">
      <summary className="cursor-pointer rounded text-xs">
        <span className="inline-flex min-w-24 flex-col gap-1 align-middle">
          <span className="font-semibold tabular-nums">{match.percent}%</span>
          <span
            role="meter"
            aria-label={t("Résumé match")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={match.percent}
            aria-valuetext={coverage}
            className="block h-2 overflow-hidden rounded-full border border-line bg-panel"
          >
            <span className="block h-full bg-teal-600" style={{ width: `${match.percent}%` }} />
          </span>
          <span className="text-muted">{coverage}</span>
        </span>
      </summary>
      <p className="mt-2 text-xs text-muted">
        {t("Compares skills identified in the job title and saved requirements.")}
      </p>
      <dl className="mt-2 grid gap-1 text-xs">
        <dt className="font-semibold">{t("On your résumé")}</dt>
        <dd>{match.matched.join(", ") || t("None")}</dd>
        <dt className="font-semibold">{t("Not listed on your résumé")}</dt>
        <dd>{match.missing.join(", ") || t("None")}</dd>
      </dl>
    </details>
  );
}
