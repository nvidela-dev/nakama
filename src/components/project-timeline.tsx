import type { CSSProperties } from "react";
import type { StageProgress } from "@/lib/project-progress";
import { translator } from "@/lib/i18n";

export function ProjectTimeline({ stages, t }: {
  stages?: StageProgress[];
  t: ReturnType<typeof translator>;
}) {
  if (!stages) return <span className="project-timeline-empty">{t("Choose a flow first.")}</span>;
  return <ol className="project-timeline" aria-label={t("Stage progress")}>
    {stages.map((stage) => {
      const state = stage.reviewed ? t("✓ Reviewed") : stage.started ? t("In progress") : t("Not started");
      const label = `${t(stage.name)} · ${state} · ${stage.answered}/${stage.total} ${t("questions answered")}${stage.revisit ? t(" · revisit") : ""} · ${stage.blocked} ${t("blocked")} · ${stage.skipped} ${t("skipped")}`;
      return <li key={stage.id} title={label} aria-label={label}
        className={`${stage.started ? "started" : ""} ${stage.reviewed ? "reviewed" : ""} ${stage.revisit ? "revisit" : ""}`}>
        <span className="timeline-marker" aria-hidden="true" style={{ "--stage-progress": `${stage.total ? stage.answered / stage.total * 100 : 0}%` } as CSSProperties}>
          <span>{stage.revisit ? "!" : stage.reviewed ? "✓" : stage.started ? "·" : ""}</span>
        </span>
        <span className="timeline-name" aria-hidden="true">{t(stage.name)}</span>
        <span className="timeline-count" aria-hidden="true">{stage.answered}/{stage.total}</span>
      </li>;
    })}
  </ol>;
}
