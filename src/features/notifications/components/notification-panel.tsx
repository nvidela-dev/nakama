"use client";
import { projectPageHref } from "@/shared/navigation/project-href";
import { Panel } from "@/shared/ui/panel";

import { Button } from "@/shared/ui/button";

import Link from "next/link";
import type { unreadComments } from "@/features/notifications/actions";
import { LoadingState } from "@/shared/ui/loading-state";
import { useT } from "@/shared/i18n/provider";

type Inbox = Awaited<ReturnType<typeof unreadComments>>;

export function NotificationPanel({
  inbox,
  error,
  busy,
  refresh,
  older,
  mark,
  close,
}: {
  inbox: Inbox | undefined;
  error: boolean;
  busy: boolean;
  refresh: () => void;
  older: () => void;
  mark: (id: string) => void;
  close: () => void;
}) {
  const t = useT();
  return (
    <Panel
      id="comment-notifications"
      className={
        "notification-panel absolute z-[50] right-0 top-[calc(100%_+_8px)] w-[min(390px,_calc(100vw_-_32px))] max-h-[min(650px,_75dvh)] overflow-y-auto [box-shadow:0_12px_36px_#0008] max-[700px]:fixed max-[700px]:top-25 max-[700px]:right-4"
      }
      aria-label={t("Unread comments")}
    >
      <h2
        className={
          "mb-[0.83em] mt-0 font-sans tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3 text-[16px]"
        }
      >
        {t("Unread comments")}
        {inbox ? ` (${inbox.count})` : ""}
      </h2>
      {error && (
        <p role="alert" className={"mb-[1em] mt-0"}>
          {t("Could not load notifications.")}{" "}
          <Button type="button" onClick={() => void refresh()}>
            {t("Retry")}
          </Button>
        </p>
      )}
      {!inbox && !error && <LoadingState label={t("Loading…")} variant="compact" lines={3} />}
      {inbox?.count === 0 && <p className={"mb-[1em] mt-0"}>{t("No unread comments.")}</p>}
      <ol className={"notification-list list-none p-0 m-0"}>
        {inbox?.items.map((c) => {
          const query = new URLSearchParams();
          if (c.stage_id === "artifacts") {
            query.set("view", c.stage_id);
          } else {
            if (c.stage_id && c.stage_id !== "tasks") query.set("stage", c.stage_id);
            if (c.node_id) query.set("node", c.node_id);
          }
          query.set("comment", c.id);
          return (
            <li key={c.id} className={"py-3.5 border-t border-t-line"}>
              <Link
                href={projectPageHref(
                  `/projects/${c.project_id}${c.stage_id === "tasks" ? "/discussion" : ""}`,
                  query,
                  "comment-" + c.id,
                )}
                onClick={() => close()}
              >
                <strong className={"block"}>{c.project_name}</strong>
                <span className={"block text-muted text-[12px] mt-1"}>{c.author_name}</span>
                <p className={"mb-[1em] mt-0 text-[13px] my-2"}>{c.content}</p>
              </Link>
              <Button type="button" disabled={busy} onClick={() => void mark(c.id)}>
                {t("Mark as read")}
              </Button>
            </li>
          );
        })}
      </ol>
      {inbox?.next && (
        <Button type="button" disabled={busy} onClick={() => void older()}>
          {t("Older unread comments")}
        </Button>
      )}
    </Panel>
  );
}
