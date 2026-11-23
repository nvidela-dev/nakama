"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { commentsReadEvent } from "../events";
import { unreadComments, readComments } from "@/features/notifications/actions";

type Inbox = Awaited<ReturnType<typeof unreadComments>>;

export function useUnreadNotifications() {
  const [inbox, setInbox] = useState<Inbox>();
  const [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const next = await unreadComments();
      if (ticket === generation.current) {
        setInbox(next);
        setError(false);
      }
    } catch {
      if (ticket === generation.current) setError(true);
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(refresh, 0);
    let timer: ReturnType<typeof setTimeout>;
    let lastFocus = Date.now();
    function update() {
      if (!document.hidden) void refresh();
    }
    function afterRead() {
      clearTimeout(timer);
      timer = setTimeout(update, 150);
    }
    function onFocus() {
      if (Date.now() - lastFocus < 5000) return;
      lastFocus = Date.now();
      update();
    }
    const interval = setInterval(update, 60000);
    window.addEventListener("focus", onFocus);
    window.addEventListener(commentsReadEvent, afterRead);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(commentsReadEvent, afterRead);
    };
  }, [refresh]);
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
      const ticket = ++generation.current;
      const page = await unreadComments(inbox.next);
      if (ticket !== generation.current) return;
      setInbox({ ...page, items: [...inbox.items, ...page.items] });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return { inbox, error, busy, refresh, mark, older };
}
