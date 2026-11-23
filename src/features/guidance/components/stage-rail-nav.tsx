"use client";
import { stageCoverage, stageLabel } from "../model/stage-progress";
import { useT } from "@/shared/i18n/provider";
import Link from "next/link";
import type { Guidance } from "@/features/guidance/model/types";
import type { FlowStage } from "@/features/guidance/model/flows";
import type { Flow } from "../model/flows";

export function StageRailNav({
  flow,
  guidance,
  href,
  activeStage,
}: {
  flow: Flow;
  guidance: Guidance;
  href: (stage?: string, node?: string) => string;
  activeStage: FlowStage;
}) {
  const t = useT();
  return (
    <nav
      className={
        "desktop-stage-nav hidden lg:flex flex-col flex-nowrap items-stretch gap-1.5 m-0 sticky top-5"
      }
      aria-label={t("All stages")}
    >
      {flow.stages.map((stage, index) => {
        const coverage = stageCoverage(stage, guidance);
        const { answered, total, reviewed, revisit } = coverage;
        const status = stageLabel(coverage);
        return (
          <Link
            key={stage.id}
            href={href(stage.id)}
            className={[
              `stage-rail-link${reviewed ? " reviewed" : ""}${revisit ? " revisit" : ""}`,
              "flex items-center flex-none gap-2 min-h-18 py-3 px-2.5 border border-[var(--theme-border,#637a55)] rounded-[6px] text-[12px] wrap-anywhere justify-start bg-[var(--theme-surface,#2a4034)]",
              stage.id === activeStage.id &&
                "border-lime bg-[var(--theme-surface,#405b39)] shadow-[inset_3px_0_var(--color-lime)]",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={stage.id === activeStage.id ? "step" : undefined}
            title={`${t(status)} · ${answered}/${total} ${t("questions answered")}${revisit ? t(" · revisit") : ""}`}
          >
            <span className={"rail-number [font:10px_monospace] shrink-0 text-lime"}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className={"rail-label min-w-0 flex-1"}>
              <strong className={"block text-[12px] font-semibold"}>{t(stage.name)}</strong>
              <small
                className={`block mt-0.75 text-[11px] leading-[1.4] ${revisit ? "text-[var(--theme-text,#d5df8a)]" : reviewed ? "text-lime" : "text-muted"}`}
              >
                {answered}/{total} · {t(status)}
                {revisit ? t(" · revisit") : ""}
              </small>
              <span
                className="block h-1 rounded-full bg-line overflow-hidden mt-2"
                aria-hidden="true"
              >
                <span
                  className="block h-full bg-lime"
                  style={{
                    width: `${total ? (answered / total) * 100 : 0}%`,
                  }}
                />
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
