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
        <ol className="project-timeline timeline-placeholder" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index}>
              <ProgressMarker decorative value={0} max={1} className="timeline-marker" />
              <span className="timeline-name">
                <span className="timeline-placeholder-bar" />
              </span>
              <span className="timeline-count">
                <span className="timeline-placeholder-bar short" />
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  return (
    <ol className="project-timeline" aria-label={t("Stage progress")}>
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
            className={`${stage.started ? "started" : ""} ${stage.reviewed ? "reviewed" : ""} ${stage.revisit ? "revisit" : ""}`}
          >
            <ProgressMarker
              decorative
              value={stage.answered}
              max={stage.total}
              className="timeline-marker"
            />
            <span className="timeline-name" aria-hidden="true">
              {t(stage.name)}
            </span>
            <span className="timeline-count" aria-hidden="true">
              {stage.answered}/{stage.total}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
