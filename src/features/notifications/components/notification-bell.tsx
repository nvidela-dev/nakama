"use client";
import { Icon } from "@/shared/ui/icon";
import { Panel } from "@/shared/ui/panel";

import { Button } from "@/shared/ui/button";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { unreadComments, readComments } from "@/features/notifications/actions";
import { LoadingState } from "@/shared/ui/loading-state";
import { useT } from "@/shared/i18n/provider";

type Inbox = Awaited<ReturnType<typeof unreadComments>>;
export function NotificationBell() {
  const path = usePathname();
  return <NotificationMenu key={path} />;
}
function NotificationMenu() {
  const t = useT();
  const [inbox, setInbox] = useState<Inbox>(),
    [open, setOpen] = useState(false);
  const [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const refresh = useCallback(async () => {
    try {
      setInbox(await unreadComments());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    void unreadComments()
      .then((value) => {
        if (!cancelled) {
          setInbox(value);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 60000);
    window.addEventListener("focus", update);
    window.addEventListener("nakama-comments-read", update);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("nakama-comments-read", update);
    };
  }, [refresh]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  async function mark(id: string) {
    setBusy(true);
    try {
      await readComments([id]);
      await refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function older() {
    if (!inbox?.next) return;
    setBusy(true);
    try {
      const page = await unreadComments(inbox.next);
      setInbox({ ...page, items: [...inbox.items, ...page.items] });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="notification-bell" ref={root}>
      <Button
        type="submit"
        ref={button}
        className="notification-trigger"
        aria-label={`${t("Unread comments")}${inbox ? `: ${inbox.count}` : ""}`}
        aria-expanded={open}
        aria-controls="comment-notifications"
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
      >
        <Icon name="bell" />
        {!!inbox?.count && (
          <span className="notification-badge">{inbox.count > 99 ? "99+" : inbox.count}</span>
        )}
        {error && <span aria-hidden="true">!</span>}
      </Button>
      {open && (
        <Panel
          id="comment-notifications"
          className="notification-panel"
          aria-label={t("Unread comments")}
        >
          <h2>
            {t("Unread comments")}
            {inbox ? ` (${inbox.count})` : ""}
          </h2>
          {error && (
            <p role="alert">
              {t("Could not load notifications.")}{" "}
              <Button type="submit" onClick={() => void refresh()}>
                {t("Retry")}
              </Button>
            </p>
          )}
          {!inbox && !error && <LoadingState label={t("Loading…")} variant="compact" lines={3} />}
          {inbox?.count === 0 && <p>{t("No unread comments.")}</p>}
          <ol className="notification-list">
            {inbox?.items.map((c) => {
              const query = new URLSearchParams();
              if (c.stage_id === "tasks" || c.stage_id === "artifacts") {
                query.set("view", c.stage_id);
              } else {
                if (c.stage_id) query.set("stage", c.stage_id);
                if (c.node_id) query.set("node", c.node_id);
              }
              query.set("comment", c.id);
              return (
                <li key={c.id}>
                  <Link
                    href={`/projects/${c.project_id}?${query}#comment-${c.id}`}
                    onClick={() => setOpen(false)}
                  >
                    <strong>{c.project_name}</strong>
                    <span>{c.author_name}</span>
                    <p>{c.content}</p>
                  </Link>
                  <Button type="submit" disabled={busy} onClick={() => void mark(c.id)}>
                    {t("Mark as read")}
                  </Button>
                </li>
              );
            })}
          </ol>
          {inbox?.next && (
            <Button type="submit" disabled={busy} onClick={() => void older()}>
              {t("Older unread comments")}
            </Button>
          )}
        </Panel>
      )}
    </div>
  );
}
