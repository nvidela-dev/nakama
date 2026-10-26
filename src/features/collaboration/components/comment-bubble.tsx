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
        "w-fit max-w-[94%] min-w-27.5 pt-1.25 px-2.25 pb-1 [box-shadow:0_1px_1px_#0003] text-[12px] leading-[1.4] break-words wrap-anywhere",
        own
          ? "ml-auto bg-[var(--theme-chat-own,#20513e)] rounded-[10px_3px_10px_10px]"
          : "bg-[var(--theme-chat,#24352f)] rounded-[3px_10px_10px_10px]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={"comment-bubble-heading flex justify-between items-center gap-2 min-h-5 min-w-0"}
      >
        <strong className={"text-lime text-[10px] leading-[1.3] break-words wrap-anywhere"}>
          {author}
        </strong>
        {actions}
      </div>
      <div className={"comment-bubble-content min-w-0 break-words wrap-anywhere"}>{children}</div>
      <div
        className={
          "comment-meta flex items-baseline flex-wrap justify-end gap-1.25 mt-0.75 text-[10px] leading-[1.3] text-[var(--theme-text,#c4d2ca)]"
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
