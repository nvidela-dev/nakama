"use client";
import Link from "next/link";
import { useT } from "@/shared/i18n/provider";
import { useLocale } from "@/shared/i18n/provider";
import { formatDate } from "@/shared/i18n/date";
import type { Revision } from "../model/types";

export function AnswerHistory({
  history,
  olderHref,
  latestHref,
}: {
  history: Revision[];
  olderHref?: string | undefined;
  latestHref?: string | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <details
      className={
        "history border-t border-t-line mt-7 pt-5 text-[12px] lg:compact:pt-2.5 lg:compact:mt-3.5"
      }
    >
      <summary
        className={
          "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 cursor-pointer text-lime"
        }
      >
        {t("Earlier work ·")} {history.length}{" "}
        {history.length === 1 ? t("revision") : t("revisions")}
      </summary>
      {history.map((r) => (
        <article key={r.revision} className={"border-b border-b-line py-5 px-0 lg:compact:py-3"}>
          <strong>
            {t("Revision")} {r.revision} · {t(r.status)}
          </strong>
          <small className={"block text-muted mt-1.25 mx-0 mb-3.5"}>
            {r.origin === "capture"
              ? t("From the original project capture")
              : t("Saved by {name}", {
                  name: r.author_name || t("a former member"),
                })}{" "}
            · {formatDate(r.created_at, locale)}
          </small>
          {r.choice && (
            <p className={"text-[12px] m-0"}>
              {t("Direction:")} {t(r.choice)}
            </p>
          )}
          <p className={"preserve-lines whitespace-pre-wrap wrap-anywhere text-[12px] m-0"}>
            {r.content || t("(No text)")}
          </p>
        </article>
      ))}
      {latestHref && <Link href={latestHref}>{t("Latest revisions")}</Link>}{" "}
      {olderHref && <Link href={olderHref}>{t("Older revisions")}</Link>}
    </details>
  );
}
