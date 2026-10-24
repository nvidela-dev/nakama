import { ProgressMarker } from "@/shared/ui/progress-marker";
import type { StageProgress } from "@/features/projects/model";
import type { translator } from "@/shared/i18n/index";

export function ProjectTimeline({
  stages,
  t,
}: {
  stages?: StageProgress[] | undefined;
  t: ReturnType<typeof translator>;
}) {
  if (!stages)
    return (
      <div role="img" aria-label={t("Choose a flow first.")} title={t("Choose a flow first.")}>
        <ol
          className={
            "project-timeline timeline-placeholder my-[1em] opacity-55 flex list-none mt-3.5 mx-0 mb-0 p-0"
          }
          aria-hidden="true"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <li
              key={index}
              className={"relative flex-1 min-w-0 text-center text-[11px] leading-[1.3] text-muted"}
            >
              {index < 4 && (
                <span
                  aria-hidden="true"
                  className="timeline-connector absolute top-3 left-1/2 w-full h-0.25 bg-line"
                />
              )}
              <ProgressMarker
                decorative
                value={0}
                max={1}
                className={"timeline-marker grid mt-0 mx-auto mb-1.5 z-[1] bg-line"}
              />
              <span className={"timeline-name block px-0.5 truncate tracking-[-0.02em]"}>
                <span
                  className={
                    "timeline-placeholder-bar inline-block w-[65%] h-1 rounded-[2px] bg-line"
                  }
                />
              </span>
              <span
                className={
                  "timeline-count block mt-0.25 tabular-nums text-[10px] leading-[1.3] text-muted"
                }
              >
                <span
                  className={
                    "timeline-placeholder-bar short inline-block h-1 rounded-[2px] bg-line w-[24%]"
                  }
                />
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  return (
    <ol
      className={"project-timeline my-[1em] flex list-none mt-3.5 mx-0 mb-0 p-0"}
      aria-label={t("Stage progress")}
    >
      {stages.map((stage, index) => {
        const state = stage.reviewed
          ? t("✓ Reviewed")
          : stage.started
            ? t("In progress")
            : t("Not started");
        const label = `${t(stage.name)} · ${state} · ${stage.answered}/${stage.total} ${t("questions answered")}${stage.revisit ? t(" · revisit") : ""} · ${stage.blocked} ${t("blocked")} · ${stage.skipped} ${t("skipped")}`;
        return (
          <li
            key={stage.id}
            title={label}
            aria-label={label}
            className={[
              `${stage.started ? "started" : ""} ${stage.reviewed ? "reviewed" : ""} ${stage.revisit ? "revisit" : ""}`,
              "relative flex-1 min-w-0 text-center text-[11px] leading-[1.3] text-muted",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {index < stages.length - 1 && (
              <span
                aria-hidden="true"
                className="timeline-connector absolute top-3 left-1/2 w-full h-0.25 bg-line"
              />
            )}
            <ProgressMarker
              decorative
              value={stage.answered}
              max={stage.total}
              className={"timeline-marker grid mt-0 mx-auto mb-1.5 z-[1]"}
            />
            <span
              className={`timeline-name block px-0.5 truncate tracking-[-0.02em] ${stage.started ? "text-ink" : "text-muted"}`}
              aria-hidden="true"
            >
              {t(stage.name)}
            </span>
            <span
              className={
                "timeline-count block mt-0.25 tabular-nums text-[10px] leading-[1.3] text-muted"
              }
              aria-hidden="true"
            >
              {stage.answered}/{stage.total}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
