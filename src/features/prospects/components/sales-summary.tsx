import { statusLabel } from "../model";

type Summary = {
  called: boolean;
  latest_call_note: string | null;
  latest_call_outcome: "deal" | "rejected" | null;
  next_follow_up: string | null;
};

export function SalesSummary({
  summary,
  t,
  compact = false,
}: {
  summary: Summary;
  t: (message: string) => string;
  compact?: boolean;
}) {
  const note = [
    summary.latest_call_outcome ? t(statusLabel[summary.latest_call_outcome]) : null,
    summary.latest_call_note,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <dl className={compact ? "grid gap-1 text-xs" : "grid gap-2 sm:grid-cols-2"}>
      <div>
        <dt className="font-semibold">{t("Latest call outcome")}</dt>
        <dd
          className={
            compact
              ? "line-clamp-2 wrap-anywhere text-muted"
              : "whitespace-pre-wrap wrap-anywhere text-muted"
          }
        >
          {note || t(summary.called ? "No outcome recorded" : "No call recorded")}
        </dd>
      </div>
      <div>
        <dt className="font-semibold">{t("Next follow-up")}</dt>
        <dd
          className={compact ? "line-clamp-2 wrap-anywhere text-muted" : "wrap-anywhere text-muted"}
        >
          {summary.next_follow_up || t("No open follow-up")}
        </dd>
      </div>
    </dl>
  );
}
