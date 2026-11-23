"use client";
import { InlineConfirm } from "@/shared/ui/form-patterns";
import { FormStack } from "@/shared/ui/workspace-layout";
import { Icon } from "@/shared/ui/icon";
import { ActionMenu } from "@/shared/ui/action-menu";
import { CommentBubble } from "./comment-bubble";
import { CommentText } from "./comment-text";
import { Textarea } from "@/shared/ui/controls";
import { Button } from "@/shared/ui/button";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Comment } from "@/features/collaboration/model";
import { changeComment } from "@/features/collaboration/actions";
import { useLocale, useT } from "@/shared/i18n/provider";
import { formatDate } from "@/shared/i18n/date";
import { Feedback } from "@/shared/ui/feedback";
export function CommentItem({
  comment,
  projectId,
  userId,
  owner,
}: {
  comment: Comment;
  projectId: string;
  userId: string;
  owner: boolean;
}) {
  const t = useT(),
    locale = useLocale();
  const [editing, setEditing] = useState(false),
    [confirming, setConfirming] = useState(false);
  const [expectedRevision, setExpectedRevision] = useState(comment.revision);
  const [draft, setDraft] = useState(comment.content);
  const item = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const target = item.current;
    if (!target || window.location.hash !== `#comment-${comment.id}`) return;
    let frame = 0,
      stopped = false;
    const reveal = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (stopped || window.location.hash !== `#comment-${comment.id}`) return;
        target.scrollIntoView({ block: "center" });
        target.focus({ preventScroll: true });
      });
    };
    // Lazy answer forms can change the height above a linked comment after hydration.
    const observer = new ResizeObserver(reveal);
    observer.observe(target.closest(".workspace-columns") ?? target.parentElement ?? target);
    const stop = () => {
      stopped = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const event of events) window.addEventListener(event, stop, { once: true, passive: true });
    reveal();
    return () => {
      stop();
      for (const event of events) window.removeEventListener(event, stop);
    };
  }, [comment.id]);
  const [state, action, pending] = useActionState(
    async (previous: { error?: string; success?: string }, data: FormData) => {
      const result = await changeComment(projectId, comment.id, expectedRevision, previous, data);
      if (result.success) {
        setEditing(false);
        setConfirming(false);
        requestAnimationFrame(() => document.getElementById(`comment-${comment.id}`)?.focus());
      }
      return result;
    },
    {},
  );
  return (
    <li
      data-unread-comment={
        comment.is_read || comment.deleted_at || comment.author_id === userId
          ? undefined
          : comment.id
      }
      data-action-scope
      ref={item}
      id={`comment-${comment.id}`}
      tabIndex={-1}
      className={
        "comment-item flex min-w-0 p-0 border-0 wrap-anywhere target:[outline:2px_solid_var(--color-lime)] target:[outline-offset:4px]"
      }
    >
      <CommentBubble
        own={comment.author_id === userId}
        author={`${comment.author_name}${comment.former_member ? ` · ${t("Former member")}` : ""}`}
        dateTime={new Date(comment.created_at).toISOString()}
        dateLabel={formatDate(comment.created_at, locale)}
        timeLabel={new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }).format(new Date(comment.created_at))}
        edited={comment.edited_at ? t("Edited") : undefined}
        actions={
          !comment.deleted_at &&
          !editing &&
          !confirming &&
          (comment.author_id === userId || owner) ? (
            <ActionMenu id={`comment-actions-${comment.id}`} label={t("Comment actions")}>
              {comment.author_id === userId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setExpectedRevision(comment.revision);
                    setDraft(comment.content);
                    setEditing(true);
                  }}
                >
                  <Icon name="edit" /> {t("Edit comment")}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setExpectedRevision(comment.revision);
                  setConfirming(true);
                }}
              >
                <Icon name="delete" /> {t("Remove comment")}
              </Button>
            </ActionMenu>
          ) : undefined
        }
      >
        {comment.deleted_at ? (
          <p className={"muted mb-[1em] mt-0 text-muted text-[12px]"}>{t("Comment removed.")}</p>
        ) : (
          <>
            {!editing && <CommentText content={comment.content} />}
            {editing && (
              <FormStack action={action} className="comment-edit">
                <input
                  type="hidden"
                  name="operation"
                  value="edit"
                  className={"w-full [resize:vertical]"}
                />
                <label htmlFor={`edit-comment-${comment.id}`} className={"text-[13px] text-ink"}>
                  {t("Edit comment")}
                </label>
                <Textarea
                  autoFocus
                  id={`edit-comment-${comment.id}`}
                  name="content"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  required
                  maxLength={4000}
                  rows={3}
                  className={"min-h-30 w-full [resize:vertical] lg:compact:min-h-22.5"}
                />
                <div
                  className={
                    "comment-controls flex gap-1 flex-wrap my-1.25 pointer-coarse:[&_button]:min-h-11"
                  }
                >
                  <Button
                    type="submit"
                    pending={pending}
                    className={"mt-2 lg:compact:mt-1 min-h-9"}
                  >
                    {pending ? t("Saving…") : t("Save changes")}
                  </Button>
                  <Button
                    type="button"
                    className={"button secondary mt-2 lg:compact:mt-1 min-h-9"}
                    onClick={() => {
                      setEditing(false);
                      requestAnimationFrame(() =>
                        document.getElementById(`comment-actions-${comment.id}`)?.focus(),
                      );
                    }}
                    variant="secondary"
                  >
                    {t("Cancel")}
                  </Button>
                </div>
              </FormStack>
            )}
            {confirming && (
              <form action={action} className="comment-confirm">
                <p className={"mb-[1em] mt-0"}>
                  {t(
                    "Remove this comment? Its text will be permanently removed; a deletion marker will remain.",
                  )}
                </p>
                <InlineConfirm
                  confirmLabel={t("Confirm removal")}
                  cancelLabel={t("Cancel")}
                  submit={{ name: "operation", value: "delete" }}
                  pending={pending}
                  onCancel={() => {
                    setConfirming(false);
                    requestAnimationFrame(() =>
                      document.getElementById(`comment-actions-${comment.id}`)?.focus(),
                    );
                  }}
                />
              </form>
            )}
          </>
        )}
        <Feedback state={state} />
      </CommentBubble>
    </li>
  );
}
