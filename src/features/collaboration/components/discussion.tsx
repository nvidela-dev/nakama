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
import { formatDate } from "@/shared/i18n/index";
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
        "comment-item [padding-block:14px] border-b border-b-line wrap-anywhere [&:target]:[outline:2px_solid_var(--color-lime)] [&:target]:[outline-offset:4px]"
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
          <p className={"muted mb-[1em] mt-[0] text-muted text-[12px]"}>{t("Comment removed.")}</p>
        ) : (
          <>
            {!editing && <CommentText content={comment.content} />}
            {editing && (
              <form
                action={action}
                className={
                  "form-stack comment-edit flex flex-col gap-3 [&_small]:text-[11px] [&_small]:text-muted [&_select]:bg-[#101c1b] [&_select]:text-ink [&_select]:border [&_select]:border-[#4b6056] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:[outline:3px_solid_var(--color-lime)] [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
                }
              >
                <Input
                  type="hidden"
                  name="operation"
                  value="edit"
                  className={
                    "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
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
                    "min-h-30 w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:min-h-22.5 lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
                  }
                />
                <div className={"comment-controls flex gap-1.5 flex-wrap [margin-block:8px]"}>
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
                      "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] mt-2 lg:compact:mt-1 min-h-9 py-1.5 px-2.5 text-[12px]"
                    }
                    onClick={() => {
                      setEditing(false);
                      requestAnimationFrame(() =>
                        document.getElementById(`comment-actions-${comment.id}`)?.focus(),
                      );
                    }}
                  >
                    {t("Cancel")}
                  </Button>
                </div>
              </form>
            )}
            {confirming && (
              <form action={action} className="comment-confirm">
                <p className={"mb-[1em] mt-[0]"}>
                  {t(
                    "Remove this comment? Its text will be permanently removed; a deletion marker will remain.",
                  )}
                </p>
                <div className={"comment-controls flex gap-1.5 flex-wrap [margin-block:8px]"}>
                  <Button
                    type="submit"
                    autoFocus
                    name="operation"
                    value="delete"
                    disabled={pending}
                    className={"min-h-[36px] py-1.5 px-2.5 text-[12px]"}
                  >
                    {t("Confirm removal")}
                  </Button>
                  <Button
                    type="button"
                    className={
                      "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] min-h-9 py-1.5 px-2.5 text-[12px]"
                    }
                    onClick={() => {
                      setConfirming(false);
                      requestAnimationFrame(() =>
                        document.getElementById(`comment-actions-${comment.id}`)?.focus(),
                      );
                    }}
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
      className={
        'discussion mt-5 [&.panel]:p-3 [&_>_.muted]:text-[10px] [&_>_.muted]:leading-[1.45] [&_>_.muted]:mt-0 [&_>_.muted]:mx-0 [&_>_.muted]:mb-3 [&_.comment-item]:flex [&_.comment-item]:p-0 [&_.comment-item]:border-0 [&_.comment-item]:min-w-0 [&_.comment-body]:text-ink [&_.comment-body]:my-0.5 [&_.comment-body]:mx-0 [&_.comment-body]:text-[12px] [&_.comment-body]:leading-[1.45] [&_.comment-meta]:[color:#c4d2ca] [&_.comment-meta]:justify-end [&_.comment-meta]:gap-1.25 [&_.comment-meta]:text-[10px] [&_.comment-meta]:leading-[1.3] [&_.comment-meta]:mt-0.75 [&_.comment-compose]:grid [&_.comment-compose]:grid-cols-[auto_minmax(0,_1fr)_auto] [&_.comment-compose]:items-end [&_.comment-compose]:gap-[5px_8px] [&_.comment-compose]:mt-3 [&_.comment-compose]:pt-2.25 [&_.comment-compose]:border-t [&_.comment-compose]:border-t-line [&_.comment-compose_textarea]:min-h-9.5 [&_.comment-compose_textarea]:max-h-40 [&_.comment-compose_textarea]:py-1.75 [&_.comment-compose_textarea]:px-2.25 [&_.comment-compose_textarea]:text-[12px] [&_.comment-compose_textarea]:leading-[1.4] [&_.comment-compose_textarea]:rounded-[14px] [&_.comment-compose_>_button]:[grid-column:2] [&_.comment-compose_>_button]:[grid-row:2] [&_.comment-compose_>_button]:w-9 [&_.comment-compose_>_button]:min-h-9 [&_.comment-compose_>_button]:p-2 [&_.comment-compose_>_button]:rounded-full [&_.comment-edit]:gap-1.5 [&_.comment-edit_textarea]:text-[12px] [&_.comment-edit_textarea]:p-1.75 [&_.comment-controls]:my-1.25 [&_.comment-controls]:mx-0 [&_.comment-controls]:gap-1 [&_.comment-controls_button]:min-h-7 [&_.comment-controls_button]:text-[10px] [&_.comment-controls_button]:py-1 [&_.comment-controls_button]:px-1.75 [&_.comment-confirm_p]:text-[11px] [&_.comment-confirm_p]:my-1.25 [&_.comment-confirm_p]:mx-0 pointer-coarse:[&_.comment-compose_>_button]:w-11 pointer-coarse:[&_.comment-compose_>_button]:min-h-11 pointer-coarse:[&_.comment-controls_button]:min-h-11 [&_.comment-compose_>_textarea]:[grid-column:2] [&_.comment-compose_>_textarea]:[grid-row:2] [&_.comment-compose_>_button[type="submit"]]:[grid-column:3] [&_.comment-compose_>_.comment-reference-trigger]:[grid-column:1] [&_.comment-compose_>_.comment-reference-trigger]:[grid-row:2] [&_.comment-compose_>_.comment-reference-trigger]:w-7.5 [&_.comment-compose_>_.comment-reference-trigger]:min-h-9 [&_.comment-compose_>_.comment-reference-trigger]:p-1.25'
      }
      aria-label={`${t("Discussion")} · ${label}`}
    >
      <h2
        className={
          "font-mono tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mb-3 text-[14px] leading-[1.35] mt-0 mx-0 mb-1"
        }
      >
        {t("Discussion")} · {label}
      </h2>
      {latestHref && <Link href={latestHref}>{t("Latest comments")}</Link>}
      {comments.items.length ? (
        <ol className={"comment-list list-none p-0 grid gap-[6px] my-3 mx-0"}>
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
        <p className={"mb-[1em] mt-[0]"}>{t("No comments yet.")}</p>
      )}
      {olderHref && (
        <Link
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
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
