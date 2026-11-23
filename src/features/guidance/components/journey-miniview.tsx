"use client";
import { projectPageHref } from "@/shared/navigation/project-href";
import { useMiniviewScene } from "./use-miniview-scene";
import { symbols as nodeSymbols } from "../model/node-presentation";
import { Icon, type IconName } from "@/shared/ui/icon";
import { Button } from "@/shared/ui/button";

import Link from "next/link";
import type { Guidance } from "@/features/guidance/model/types";
import { useT } from "@/shared/i18n/provider";

const symbols: Record<string, IconName> = {
  ...nodeSymbols,
  "✓ Reviewed": "answered",
  "All questions answered": "answered",
  "In progress": "draft",
  "Not started": "unanswered",
};

export default function JourneyMiniview({
  guidance,
  base,
  stageId,
  nodeId,
}: {
  guidance: Guidance;
  base: string;
  stageId?: string | undefined;
  nodeId?: string | undefined;
}) {
  const t = useT();
  const { canvas, labels, failed, angle, setAngle, graph } = useMiniviewScene(
    guidance,
    stageId,
    nodeId,
  );
  return (
    <div
      className={
        "journey-miniview mb-[1.25rem] p-[1rem] border border-line rounded-[4px] [background:radial-gradient(ellipse_at_50%_50%,_var(--color-panel)_0%,_var(--color-bg)_65%)] text-ink [box-shadow:inset_0_0_60px_var(--color-dark)] font-sans"
      }
    >
      <div
        className={
          "miniview-heading flex items-center justify-between gap-[0.75rem] flex-wrap pb-[0.6rem] border-b border-b-line"
        }
      >
        <strong
          className={
            "text-lime uppercase tracking-[0.18em] text-[0.85rem] [text-shadow:0_0_12px_var(--color-line)]"
          }
        >
          {t("3D stage map")}
        </strong>
        <div
          className={"miniview-controls flex gap-[0.4rem]"}
          role="group"
          aria-label={t("Map perspective")}
        >
          <Button
            type="button"
            onClick={() => setAngle(Math.max(-2, angle - 1))}
            disabled={failed || angle === -2}
            aria-label={t("Rotate left")}
            className={"min-h-10 py-[0.35rem] px-[0.65rem] text-[0.75rem] disabled:opacity-50"}
          >
            <Icon name="rotateLeft" />
          </Button>
          <Button
            type="button"
            onClick={() => setAngle(0)}
            disabled={failed || angle === 0}
            className={"min-h-10 py-[0.35rem] px-[0.65rem] text-[0.75rem] disabled:opacity-50"}
          >
            {t("Reset view")}
          </Button>
          <Button
            type="button"
            onClick={() => setAngle(Math.min(2, angle + 1))}
            disabled={failed || angle === 2}
            aria-label={t("Rotate right")}
            className={"min-h-10 py-[0.35rem] px-[0.65rem] text-[0.75rem] disabled:opacity-50"}
          >
            <Icon name="rotateRight" />
          </Button>
        </div>
      </div>
      <p className={"muted mb-[1em] mt-0 text-muted text-[0.7rem]"}>
        {t(
          "Saved progress across stages. Branches show dependencies; upcoming stages remain visible.",
        )}
      </p>
      {failed ? (
        <p role="status" className={"mb-[1em] mt-0"}>
          {t("3D is unavailable. Use the stage tree below.")}
        </p>
      ) : (
        <div
          className={"miniview-scroll overflow-x-auto"}
          tabIndex={0}
          role="region"
          aria-label={t("Stage map. Scroll horizontally on small screens.")}
        >
          <div
            className={
              'miniview-scene relative min-w-185 h-107.5 max-w-275 [margin-inline:auto] after:[content:""] after:absolute after:inset-0 after:[pointer-events:none] after:[background:repeating-linear-gradient(transparent_0_3px,_#17231c30_3px_4px)]'
            }
          >
            <canvas ref={canvas} aria-hidden="true" className={"block w-full h-full"} />
            <nav
              aria-label={t("Stages and question branches")}
              className={
                "flex items-center gap-7 text-[13px] max-[700px]:gap-3.5 max-[700px]:text-[12px]"
              }
            >
              {graph.points.map((point) => (
                <Link
                  key={point.id}
                  ref={(element) => {
                    if (element) labels.current.set(point.id, element);
                    else labels.current.delete(point.id);
                  }}
                  href={projectPageHref(base, {
                    stage: point.stageId,
                    node: point.nodeId ?? undefined,
                  })}
                  className={[
                    `miniview-point ${point.nodeId ? "miniview-node" : "miniview-stage"}`,
                    "absolute [transform:translate(-50%,_-50%)] w-7.5 h-7.5 rounded-full z-[1] [&[aria-current]]:[outline:2px_solid_white] [&[aria-current]]:[outline-offset:3px] [&[aria-current]]:[outline-color:var(--color-lime)] focus-visible:[outline:2px_solid_white] focus-visible:[outline-offset:3px] focus-visible:[outline-color:var(--color-lime)] hover:z-[3] focus-visible:z-[3] [&:hover_.miniview-label]:block [&:focus-visible_.miniview-label]:block",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={
                    (nodeId ? point.id === nodeId : point.id === stageId) ? "location" : undefined
                  }
                  aria-label={`${t(point.label)} · ${t(point.status)}${point.revisit ? t(" · revisit") : ""}`}
                >
                  <span
                    className={
                      "miniview-label absolute left-1/2 [transform:translateX(-50%)] w-[max-content] max-w-36.25 py-[0.25rem] px-[0.4rem] bg-bg border rounded-[2px] text-ink text-[0.7rem] text-center leading-[1.35] border-line tracking-[0.03em] top-[auto] bottom-10 hidden [pointer-events:none]"
                    }
                  >
                    {!point.nodeId && (
                      <Icon name={symbols[point.status] ?? "unanswered"} size={12} />
                    )}
                    {t(point.label)}
                    <small className={"block text-muted text-[0.65rem]"}>
                      {t(point.status)}
                      {point.revisit ? t(" · revisit") : ""}
                    </small>
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
      <p
        className={
          "miniview-legend mt-0 text-muted text-[0.7rem] mb-0 pt-[0.7rem] border-t border-t-line"
        }
      >
        {t(
          "Lime: answered or reviewed · Peach: in progress, draft, or blocked · Muted: not started or skipped",
        )}
      </p>
    </div>
  );
}
