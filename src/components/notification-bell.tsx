"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { unreadComments, readComments } from "@/app/notification-actions";
import { useT } from "./language";

type Inbox = Awaited<ReturnType<typeof unreadComments>>;
export function NotificationBell() {
  const t = useT(), path = usePathname();
  const [inbox,setInbox] = useState<Inbox>(), [open,setOpen] = useState(false);
  const [error,setError] = useState(false), [busy,setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null);
  const refresh = useCallback(async () => {
    try { setInbox(await unreadComments()); setError(false); } catch { setError(true); }
  },[]);
  useEffect(() => {
    void refresh();
    const update = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(update,60000);
    window.addEventListener("focus",update);
    window.addEventListener("nakama-comments-read",update);
    return () => { clearInterval(timer); window.removeEventListener("focus",update); window.removeEventListener("nakama-comments-read",update); };
  },[refresh,path]);
  useEffect(() => { setOpen(false); },[path]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown",outside); document.addEventListener("keydown",escape);
    return () => { document.removeEventListener("pointerdown",outside); document.removeEventListener("keydown",escape); };
  },[open]);
  async function mark(id: string) {
    setBusy(true);
    try { await readComments([id]); await refresh(); } catch { setError(true); }
    finally { setBusy(false); }
  }
  async function older() {
    if (!inbox?.next) return;
    setBusy(true);
    try { const page = await unreadComments(inbox.next); setInbox({...page,items:[...inbox.items,...page.items]}); setError(false); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <div className="notification-bell" ref={root}>
    <button ref={button} className="notification-trigger" aria-label={`${t("Unread comments")}${inbox ? `: ${inbox.count}` : ""}`} aria-expanded={open} aria-controls="comment-notifications" onClick={() => { setOpen(!open); if (!open) void refresh(); }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {!!inbox?.count && <span className="notification-badge">{inbox.count > 99 ? "99+" : inbox.count}</span>}
      {error && <span aria-hidden="true">!</span>}
    </button>
    {open && <section id="comment-notifications" className="notification-panel panel" aria-label={t("Unread comments")}>
      <h2>{t("Unread comments")}{inbox ? ` (${inbox.count})` : ""}</h2>
      {error && <p role="alert">{t("Could not load notifications.")} <button onClick={() => void refresh()}>{t("Retry")}</button></p>}
      {!inbox && !error && <p role="status">{t("Loading…")}</p>}
      {inbox?.count === 0 && <p>{t("No unread comments.")}</p>}
      <ol className="notification-list">{inbox?.items.map(c => {
        const query = new URLSearchParams();
        if (c.stage_id) query.set("stage",c.stage_id);
        if (c.node_id) query.set("node",c.node_id);
        query.set("comment",c.id);
        return <li key={c.id}>
          <Link href={`/projects/${c.project_id}?${query}#comment-${c.id}`} onClick={() => setOpen(false)}>
            <strong>{c.project_name}</strong><span>{c.author_name}</span><p>{c.content}</p>
          </Link>
          <button disabled={busy} onClick={() => void mark(c.id)}>{t("Mark as read")}</button>
        </li>;
      })}</ol>
      {inbox?.next && <button disabled={busy} onClick={() => void older()}>{t("Older unread comments")}</button>}
    </section>}
  </div>;
}
