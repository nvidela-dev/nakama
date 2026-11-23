"use client";
import { useDismissibleLayer } from "@/shared/lib/use-dismissible-layer";
import { NotificationPanel } from "./notification-panel";
import { useUnreadNotifications } from "./use-unread-notifications";
import { Icon } from "@/shared/ui/icon";

import { Button } from "@/shared/ui/button";

import { useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useT } from "@/shared/i18n/provider";

export function NotificationBell() {
  const { userId } = useAuth();
  return userId ? <NotificationMenu key={userId} /> : null;
}
function NotificationMenu() {
  const t = useT();
  const path = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath !== null && openPath === path;
  const setOpen = (value: boolean) => setOpenPath(value ? path : null);
  if (openPath !== null && openPath !== path) setOpenPath(null);
  const root = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const { inbox, error, busy, refresh, mark, older } = useUnreadNotifications();
  useDismissibleLayer(
    open,
    root,
    () => setOpenPath(null),
    () => button.current?.focus(),
  );

  return (
    <div className={"notification-bell relative"} ref={root}>
      <Button
        type="button"
        ref={button}
        variant="ghost"
        className={
          "notification-trigger relative min-w-7 min-h-7 hover:[background:transparent] focus-visible:[outline:2px_solid_var(--color-lime)] focus-visible:[outline-offset:3px] pointer-coarse:min-w-11 pointer-coarse:min-h-11"
        }
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
          <span
            className={
              "notification-badge absolute top-0 right-[-4px] py-0.5 px-1.25 rounded-[12px] bg-lime text-bg text-[11px] font-bold"
            }
          >
            {inbox.count > 99 ? "99+" : inbox.count}
          </span>
        )}
        {error && <span aria-hidden="true">!</span>}
      </Button>
      {open && (
        <NotificationPanel
          inbox={inbox}
          error={error}
          busy={busy}
          refresh={refresh}
          older={older}
          mark={mark}
          close={() => setOpen(false)}
        />
      )}
    </div>
  );
}
