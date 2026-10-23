"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Comment, CommentTarget, Page } from "@/lib/collaboration";
import { readComments } from "@/app/notification-actions";
import { postComment, changeComment } from "@/app/comment-actions";
import { useLocale, useT } from "./language";
import { formatDate } from "@/lib/i18n";
import { Feedback } from "./forms";
function CommentText({ content }: { content: string }) {
  return <p className="preserve-lines comment-body">{content.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => /^https?:\/\//.test(part)
    ? <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part)}</p>;
}
function CommentItem({ comment, projectId, userId, owner }: { comment: Comment; projectId: string; userId: string; owner: boolean }) {
  const t = useT(), locale = useLocale();
  const [editing, setEditing] = useState(false), [confirming, setConfirming] = useState(false);
  const [expectedRevision, setExpectedRevision] = useState(comment.revision);
  const [draft, setDraft] = useState(comment.content);
  const item = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!item.current || comment.deleted_at || comment.author_id === userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false, read = false;
    const schedule = () => {
      clearTimeout(timer);
      if (!read && visible && document.visibilityState === "visible") {
        timer = setTimeout(() => {
          if (document.visibilityState !== "visible") return;
          void readComments([comment.id]).then(() => {
            read = true;
            observer.disconnect();
            window.dispatchEvent(new Event("nakama-comments-read"));
          }).catch(() => {});
        },1000);
      }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    observer.observe(item.current);
    document.addEventListener("visibilitychange",schedule);
    return () => { clearTimeout(timer); observer.disconnect(); document.removeEventListener("visibilitychange",schedule); };
  },[comment.id,comment.deleted_at,comment.author_id,userId]);
  const [state, action, pending] = useActionState(changeComment.bind(null, projectId, comment.id, expectedRevision), {});
  useEffect(() => { if (state.success) { setEditing(false); setConfirming(false); document.getElementById(`comment-${comment.id}`)?.focus(); } }, [state]);
  return <li ref={item} id={`comment-${comment.id}`} tabIndex={-1} className="comment-item">
    <div className="comment-meta"><strong>{comment.author_name}{comment.former_member ? ` · ${t("Former member")}` : ""}</strong><time dateTime={new Date(comment.created_at).toISOString()}>{formatDate(comment.created_at, locale)}</time>{comment.edited_at && <span>{t("Edited")}</span>}</div>
    {comment.deleted_at ? <p className="muted">{t("Comment removed.")}</p> : <>
      {!editing && <CommentText content={comment.content} />}
      {editing && <form action={action} className="form-stack comment-edit">
        <input type="hidden" name="operation" value="edit" />
        <label htmlFor={`edit-comment-${comment.id}`}>{t("Edit comment")}</label>
        <textarea autoFocus id={`edit-comment-${comment.id}`} name="content" value={draft} onChange={(event) => setDraft(event.target.value)} required maxLength={4000} rows={3} />
        <div className="comment-controls"><button disabled={pending}>{pending ? t("Saving…") : t("Save changes")}</button><button type="button" className="button secondary" onClick={() => { setEditing(false); requestAnimationFrame(() => document.getElementById(`edit-comment-button-${comment.id}`)?.focus()); }}>{t("Cancel")}</button></div>
      </form>}
      <div className="comment-controls">
        {comment.author_id === userId && !editing && !confirming && <button id={`edit-comment-button-${comment.id}`} type="button" className="button secondary" onClick={() => { setExpectedRevision(comment.revision); setDraft(comment.content); setEditing(true); }}>{t("Edit comment")}</button>}
        {(comment.author_id === userId || owner) && !confirming && !editing && <button id={`remove-comment-button-${comment.id}`} type="button" className="button secondary" onClick={() => { setExpectedRevision(comment.revision); setConfirming(true); }}>{t("Remove comment")}</button>}
      </div>
      {confirming && <form action={action} className="comment-confirm">
        <p>{t("Remove this comment? Its text will be permanently removed; a deletion marker will remain.")}</p>
        <div className="comment-controls"><button autoFocus name="operation" value="delete" disabled={pending}>{t("Confirm removal")}</button><button type="button" className="button secondary" onClick={() => { setConfirming(false); requestAnimationFrame(() => document.getElementById(`remove-comment-button-${comment.id}`)?.focus()); }}>{t("Cancel")}</button></div>
      </form>}
    </>}
    <Feedback state={state} />
  </li>;
}
export function Discussion({ projectId, target, label, comments, userId, owner, olderHref, latestHref }: {
  projectId: string; target: CommentTarget; label: string; comments: Page<Comment>; userId: string; owner: boolean; olderHref?: string; latestHref?: string;
}) {
  const t = useT();
  const [content, setContent] = useState("");
  const [state, action, pending] = useActionState(postComment.bind(null, projectId, target), {});
  useEffect(() => { if (state.success) setContent(""); }, [state]);
  return <section className="panel discussion" aria-label={`${t("Discussion")} · ${label}`}>
    <h2>{t("Discussion")} · {label}</h2>
    <p className="muted">{t("Comments are discussion, not saved answers or agreed decisions.")}</p>
    {latestHref && <Link href={latestHref}>{t("Latest comments")}</Link>}
    {comments.items.length ? <ol className="comment-list">{[...comments.items].reverse().map((comment) => <CommentItem key={comment.id} comment={comment} projectId={projectId} userId={userId} owner={owner} />)}</ol> : <p>{t("No comments yet.")}</p>}
    {olderHref && <Link className="button secondary" href={olderHref}>{t("Older comments")}</Link>}
    <form action={action} className="form-stack comment-compose">
      <label htmlFor="new-comment">{t("Add a comment")}</label>
      <textarea id="new-comment" name="content" value={content} onChange={(event) => setContent(event.target.value)} maxLength={4000} required rows={3} />
      <Feedback state={state} />
      <button disabled={pending}>{pending ? t("Posting…") : t("Post comment")}</button>
    </form>
  </section>;
}
