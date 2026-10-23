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
    <div className={`comment-bubble${own ? " comment-bubble-own" : ""}`}>
      <div className="comment-bubble-heading">
        <strong>{author}</strong>
        {actions}
      </div>
      <div className="comment-bubble-content">{children}</div>
      <div className="comment-meta">
        {edited && <span>{edited}</span>}
        <time dateTime={dateTime} title={dateLabel} aria-label={dateLabel}>
          {timeLabel}
        </time>
      </div>
    </div>
  );
}
