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
    <li ref={item} id={`comment-${comment.id}`} tabIndex={-1} className="comment-item">
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
          <p className="muted">{t("Comment removed.")}</p>
        ) : (
          <>
            {!editing && <CommentText content={comment.content} />}
            {editing && (
              <form action={action} className="form-stack comment-edit">
                <Input type="hidden" name="operation" value="edit" />
                <label htmlFor={`edit-comment-${comment.id}`}>{t("Edit comment")}</label>
                <Textarea
                  autoFocus
                  id={`edit-comment-${comment.id}`}
                  name="content"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  required
                  maxLength={4000}
                  rows={3}
                />
                <div className="comment-controls">
                  <Button type="submit" disabled={pending}>
                    {pending ? t("Saving…") : t("Save changes")}
                  </Button>
                  <Button
                    type="button"
                    className="button secondary"
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
                <p>
                  {t(
                    "Remove this comment? Its text will be permanently removed; a deletion marker will remain.",
                  )}
                </p>
                <div className="comment-controls">
                  <Button
                    type="submit"
                    autoFocus
                    name="operation"
                    value="delete"
                    disabled={pending}
                  >
                    {t("Confirm removal")}
                  </Button>
                  <Button
                    type="button"
                    className="button secondary"
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
    <Panel className="discussion" aria-label={`${t("Discussion")} · ${label}`}>
      <h2>
        {t("Discussion")} · {label}
      </h2>
      {latestHref && <Link href={latestHref}>{t("Latest comments")}</Link>}
      {comments.items.length ? (
        <ol className="comment-list">
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
        <p>{t("No comments yet.")}</p>
      )}
      {olderHref && (
        <Link className="button secondary" href={olderHref}>
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
