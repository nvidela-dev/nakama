import type { ReactNode } from "react";

/** Presentation only: permissions and mutations remain in Discussion. */
export function CommentBubble({
  own,
  author,
  dateTime,
  dateLabel,
  timeLabel,
  edited,
  actions,
  children,
}: {
  own: boolean;
  author: string;
  dateTime: string;
  dateLabel: string;
  timeLabel: string;
  edited?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        `comment-bubble${own ? " comment-bubble-own" : ""}`,
        "w-[fit-content] max-w-[94%] min-w-27.5 pt-1.25 px-2.25 pb-1 [box-shadow:0_1px_1px_#0003] text-[12px] leading-[1.4] ml-[auto] bg-[#20513e] rounded-[10px_3px_10px_10px]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={
          "comment-bubble-heading flex justify-between items-center gap-[8px] min-h-[20px]"
        }
      >
        <strong className={"text-lime text-[10px] leading-[1.3]"}>{author}</strong>
        {actions}
      </div>
      <div className={"comment-bubble-content min-w-[0]"}>{children}</div>
      <div
        className={
          "comment-meta flex gap-[6px_12px] [align-items:baseline] flex-wrap text-[12px] text-muted [&_strong]:text-ink"
        }
      >
        {edited && <span>{edited}</span>}
        <time dateTime={dateTime} title={dateLabel} aria-label={dateLabel}>
          {timeLabel}
        </time>
      </div>
    </div>
  );
}
