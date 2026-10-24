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
            "project-timeline timeline-placeholder my-[1em] opacity-[0.55] flex list-none mt-1.25 mx-0 mb-0 p-0 [&_.started_.timeline-name]:text-ink [&.timeline-placeholder_.timeline-marker]:bg-line"
          }
          aria-hidden="true"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <li
              key={index}
              className={
                'relative [flex:1] min-w-0 text-center text-[9px] leading-[1.1] text-muted [&:not(:last-child)::before]:[content:""] [&:not(:last-child)::before]:absolute [&:not(:last-child)::before]:top-1.25 [&:not(:last-child)::before]:left-[50%] [&:not(:last-child)::before]:w-full [&:not(:last-child)::before]:h-0.25 [&:not(:last-child)::before]:bg-line'
              }
            >
              <ProgressMarker
                decorative
                value={0}
                max={1}
                className={[
                  "timeline-marker",
                  "grid w-2.75 h-2.75 [border-width:1.5px] mt-0 mx-[auto] mb-0.5",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
              <span
                className={[
                  "timeline-name",
                  "block [padding-inline:2px] wrap-anywhere tracking-[-0.02em]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span
                  className={
                    "timeline-placeholder-bar inline-block w-[65%] h-1 rounded-[2px] bg-line [&.short]:w-[24%]"
                  }
                />
              </span>
              <span
                className={[
                  "timeline-count",
                  "block mt-0.25 [font-variant-numeric:tabular-nums] text-[8px] leading-[1.05] text-muted",
                ]
                  .filter(Boolean)
                  .join(" ")}
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
      className={
        "project-timeline my-[1em] flex list-none mt-1.25 mx-0 mb-0 p-0 [&.timeline-placeholder_.timeline-marker]:bg-line"
      }
      aria-label={t("Stage progress")}
    >
      {stages.map((stage) => {
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
              'relative [flex:1] min-w-0 text-center text-[9px] leading-[1.1] text-muted [&:not(:last-child)::before]:[content:""] [&:not(:last-child)::before]:absolute [&:not(:last-child)::before]:top-1.25 [&:not(:last-child)::before]:left-[50%] [&:not(:last-child)::before]:w-full [&:not(:last-child)::before]:h-0.25 [&:not(:last-child)::before]:bg-line',
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ProgressMarker
              decorative
              value={stage.answered}
              max={stage.total}
              className={[
                "timeline-marker",
                "grid w-2.75 h-2.75 [border-width:1.5px] mt-0 mx-[auto] mb-0.5",
              ]
                .filter(Boolean)
                .join(" ")}
            />
            <span
              className={[
                "timeline-name",
                "block [padding-inline:2px] wrap-anywhere tracking-[-0.02em] text-ink",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            >
              {t(stage.name)}
            </span>
            <span
              className={[
                "timeline-count",
                "block mt-0.25 [font-variant-numeric:tabular-nums] text-[8px] leading-[1.05] text-muted",
              ]
                .filter(Boolean)
                .join(" ")}
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
