"use client";
import { Icon } from "@/shared/ui/icon";
import { ActionMenu } from "@/shared/ui/action-menu";
import { CommentBubble } from "./comment-bubble";
import { CommentComposer } from "./comment-composer";
import { CommentText } from "./comment-text";
import { searchChatReferences } from "../reference-actions";
import { Panel } from "@/shared/ui/panel";

import { Input, Textarea } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Comment, CommentTarget, Page } from "@/features/collaboration/model";
import { readComments } from "@/features/notifications/actions";
import { postComment, changeComment } from "@/features/collaboration/actions";
import { useLocale, useT } from "@/shared/i18n/provider";
import { formatDate } from "@/shared/i18n/date";
import { Feedback } from "@/shared/ui/feedback";
function CommentItem({
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
    if (!item.current || comment.deleted_at || comment.author_id === userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false,
      read = false;
    const schedule = () => {
      clearTimeout(timer);
      if (!read && visible && document.visibilityState === "visible") {
        timer = setTimeout(() => {
          if (document.visibilityState !== "visible") return;
          void readComments([comment.id])
            .then(() => {
              read = true;
              observer.disconnect();
              window.dispatchEvent(new Event("nakama-comments-read"));
            })
            .catch(() => {});
        }, 1000);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      schedule();
    });
    observer.observe(item.current);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [comment.id, comment.deleted_at, comment.author_id, userId]);
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
              <form
                action={action}
                className={
                  "form-stack comment-edit flex flex-col gap-3 [&_small]:text-[11px] [&_small]:text-muted [&_select]:bg-bg [&_select]:text-ink [&_select]:border [&_select]:border-[var(--theme-border,#4b6056)] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:outline-3 [&_select:focus-visible]:outline-solid [&_select:focus-visible]:outline-lime [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
                }
              >
                <Input
                  type="hidden"
                  name="operation"
                  value="edit"
                  className={
                    "w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                  }
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
                  className={
                    "min-h-30 w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:min-h-22.5 lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                  }
                />
                <div
                  className={
                    "comment-controls flex gap-1 flex-wrap my-1.25 [&_button]:min-h-7 [&_button]:text-[11px] [&_button]:py-1 [&_button]:px-1.75 pointer-coarse:[&_button]:min-h-11"
                  }
                >
                  <Button
                    type="submit"
                    disabled={pending}
                    className={"mt-2 lg:compact:mt-1 min-h-9 py-1.5 px-2.5 text-[12px]"}
                  >
                    {pending ? t("Saving…") : t("Save changes")}
                  </Button>
                  <Button
                    type="button"
                    className={
                      "button secondary mt-2 lg:compact:mt-1 min-h-9 py-1.5 px-2.5 text-[12px]"
                    }
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
              </form>
            )}
            {confirming && (
              <form action={action} className="comment-confirm">
                <p className={"mb-[1em] mt-0"}>
                  {t(
                    "Remove this comment? Its text will be permanently removed; a deletion marker will remain.",
                  )}
                </p>
                <div
                  className={
                    "comment-controls flex gap-1 flex-wrap my-1.25 [&_button]:min-h-7 [&_button]:text-[11px] [&_button]:py-1 [&_button]:px-1.75 pointer-coarse:[&_button]:min-h-11"
                  }
                >
                  <Button
                    type="submit"
                    autoFocus
                    name="operation"
                    value="delete"
                    disabled={pending}
                    className={"min-h-9 py-1.5 px-2.5 text-[12px]"}
                  >
                    {t("Confirm removal")}
                  </Button>
                  <Button
                    type="button"
                    className={"button secondary min-h-9 py-1.5 px-2.5 text-[12px]"}
                    onClick={() => {
                      setConfirming(false);
                      requestAnimationFrame(() =>
                        document.getElementById(`comment-actions-${comment.id}`)?.focus(),
                      );
                    }}
                    variant="secondary"
                  >
                    {t("Cancel")}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
        <Feedback state={state} />
      </CommentBubble>
    </li>
  );
}
export function Discussion({
  projectId,
  target,
  label,
  comments,
  userId,
  owner,
  olderHref,
  latestHref,
}: {
  projectId: string;
  target: CommentTarget;
  label: string;
  comments: Page<Comment>;
  userId: string;
  owner: boolean;
  olderHref?: string | undefined;
  latestHref?: string | undefined;
}) {
  const t = useT();
  const [content, setContent] = useState("");
  const loadReferences = useCallback(
    (search: string) => searchChatReferences(projectId, search),
    [projectId],
  );
  const [state, action, pending] = useActionState(
    async (previous: { error?: string; success?: string }, data: FormData) => {
      const result = await postComment(projectId, target, previous, data);
      if (result.success) {
        setContent("");
      }
      return result;
    },
    {},
  );
  return (
    <Panel
      className={"discussion mt-5 p-3 rounded-[10px] min-w-0 max-w-full overflow-hidden"}
      aria-label={`${t("Discussion")} · ${label}`}
    >
      <h2
        className={
          "font-sans tracking-[-0.045em] font-medium lg:compact:text-[14px] lg:compact:mb-2.5 text-[14px] leading-[1.35] mt-0 mx-0 mb-1 break-words wrap-anywhere"
        }
      >
        {t("Discussion")} · {label}
      </h2>
      {latestHref && <Link href={latestHref}>{t("Latest comments")}</Link>}
      {comments.items.length ? (
        <ol className={"comment-list list-none p-0 grid gap-1.5 my-3 mx-0 min-w-0 max-w-full"}>
          {[...comments.items].reverse().map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              projectId={projectId}
              userId={userId}
              owner={owner}
            />
          ))}
        </ol>
      ) : (
        <p className={"mb-[1em] mt-0"}>{t("No comments yet.")}</p>
      )}
      {olderHref && (
        <Link
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[var(--theme-selected,#344c39)] text-lime border border-[var(--theme-border,#658451)] hover:[background:var(--theme-selected,#456248)]"
          }
          href={olderHref}
        >
          {t("Older comments")}
        </Link>
      )}
      <CommentComposer
        action={action}
        content={content}
        onContentChange={setContent}
        pending={pending}
        state={state}
        loadReferences={loadReferences}
      />
    </Panel>
  );
}
