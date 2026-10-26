"use client";
import Link from "next/link";
import type { Activity, Page, FeedKind } from "@/features/collaboration/model";
import type { Flow } from "@/features/guidance/model/flows";
import { useLocale, useT } from "@/shared/i18n/provider";
import { formatDate } from "@/shared/i18n/date";
const labels: Record<FeedKind, string> = {
  artifact_created: "created an artifact",
  artifact_updated: "updated an artifact",
  artifact_deleted: "deleted an artifact",
  task_created: "added a task",
  task_edited: "edited a task",
  task_status_changed: "changed a task status",
  task_deleted: "deleted a task",
  tasks_imported: "imported Lock-In tasks",
  project_created: "created the project",
  project_edited: "updated project details",
  flow_selected: "selected a flow",
  invitation_created: "created an invitation",
  invitation_revoked: "revoked an invitation",
  member_joined: "joined the project",
  member_removed: "removed a member",
  comment_created: "posted a comment",
  comment_edited: "edited a comment",
  comment_deleted: "removed a comment",
  comment_moderated: "moderated a comment",
  answer_captured: "captured an answer",
  answer_saved: "saved an answer",
  stage_reviewed: "reviewed a stage",
};
export function ActivityFeed({
  projectId,
  activity,
  flow,
  olderHref,
  latestHref,
  open,
}: {
  projectId: string;
  activity: Page<Activity>;
  flow?: Flow | undefined;
  olderHref?: string | undefined;
  latestHref?: string | undefined;
  open: boolean;
}) {
  const t = useT(),
    locale = useLocale();
  const activityHint = t(
    "Earlier history includes recorded answers and stage reviews. Other activity starts with this release.",
  );
  return (
    <details
      className={
        "panel project-activity bg-panel border border-line min-w-0 max-w-full max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] p-3 rounded-[8px]"
      }
      open={open}
    >
      <summary
        className={
          "cursor-pointer select-none [[open]>&]:mb-2 focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5"
        }
      >
        <h2
          className={
            "font-sans tracking-[-0.045em] font-medium m-0 text-[14px] leading-[1.3] inline-flex items-center"
          }
        >
          {t("Activity")}{" "}
          <span
            className={
              "count align-middle text-muted border border-line rounded-[100px] text-[11px] py-0.5 px-1.5 ml-1.25"
            }
          >
            {activity.items.length}
          </span>
        </h2>
      </summary>
      <div className="flex items-center justify-end gap-2 min-w-0">
        {latestHref && (
          <Link className="text-[11px]" href={latestHref}>
            {t("Latest activity")}
          </Link>
        )}
        <details className="ml-auto text-[12px] text-muted">
          <summary className="cursor-pointer" aria-label={t("Activity")}>
            ?
          </summary>
          <p>{activityHint}</p>
        </details>
      </div>
      {activity.items.length ? (
        <ol
          className={
            "activity-list list-none my-2 mx-0 p-0 max-h-80 overflow-y-auto pr-1 min-w-0 max-w-full"
          }
        >
          {activity.items.map((event) => {
            const stage = flow?.stages.find((stage) => stage.id === event.stage_id);
            const node = stage?.nodes.find((node) => node.id === event.node_id);
            const query = new URLSearchParams();
            if (stage) query.set("stage", stage.id);
            if (node) query.set("node", node.id);
            if (event.kind.startsWith("task") || event.stage_id === "tasks")
              query.set("view", "tasks");
            if (event.kind.startsWith("artifact") || event.stage_id === "artifacts")
              query.set("view", "artifacts");
            const href = `/projects/${projectId}${query.size ? `?${query}` : ""}`;
            return (
              <li
                key={event.sort_key}
                className={
                  "py-1.75 border-b border-b-line min-w-0 max-w-full break-words wrap-anywhere"
                }
              >
                <p className={"m-0 text-[11px] leading-[1.4] min-w-0 break-words wrap-anywhere"}>
                  <strong>{event.actor_name || t("Former member")}</strong>
                  {event.former_member && event.actor_name ? ` · ${t("Former member")}` : ""}{" "}
                  {t(labels[event.kind] ?? "Recorded activity")}{" "}
                  {event.subject_name && <span>· {event.subject_name}</span>}
                </p>
                {(stage ||
                  node ||
                  event.comment_id ||
                  event.kind.startsWith("task") ||
                  event.kind.startsWith("artifact") ||
                  event.stage_id === "tasks" ||
                  event.stage_id === "artifacts") && (
                  <Link
                    href={href}
                    className="text-lime underline text-[11px] break-words wrap-anywhere"
                  >
                    {event.stage_id === "artifacts" || event.kind.startsWith("artifact")
                      ? t("Artifacts")
                      : event.stage_id === "tasks" || event.kind.startsWith("task")
                        ? t("To-do")
                        : node
                          ? t(node.label)
                          : stage
                            ? t(stage.name)
                            : t("Project discussion")}
                  </Link>
                )}
                {event.detail && (
                  <small
                    className={
                      "block text-[11px] leading-[1.4] text-muted break-words wrap-anywhere"
                    }
                  >
                    {t(event.detail)}
                  </small>
                )}
                <time
                  dateTime={new Date(event.created_at).toISOString()}
                  className={"block text-[11px] leading-[1.4] text-muted break-words"}
                >
                  {formatDate(event.created_at, locale)}
                </time>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={"mb-[1em] mt-0"}>{t("No recorded activity yet.")}</p>
      )}
      {olderHref && (
        <Link
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-2 min-h-8 py-1.5 px-3 text-[11px] font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[var(--theme-selected,#344c39)] text-lime border border-[var(--theme-border,#658451)] hover:[background:var(--theme-selected,#456248)] pointer-coarse:min-h-11"
          }
          href={olderHref}
        >
          {t("Older activity")}
        </Link>
      )}
    </details>
  );
}
