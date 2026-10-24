"use client";
import { Icon, type IconName } from "@/shared/ui/icon";
import { Panel } from "@/shared/ui/panel";

import { Button } from "@/shared/ui/button";

import { ProjectWork } from "@/features/projects/components/project-work";
import { WaveMark } from "@/shared/ui/wave-mark";
import { StageMapPopup } from "@/features/guidance/components/stage-map-popup";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useT } from "@/shared/i18n/provider";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Guidance, Revision } from "@/features/guidance/model/types";
import type { FlowStage } from "@/features/guidance/model/flows";
import { LoadingState } from "@/shared/ui/loading-state";
function EditorLoading() {
  const t = useT();
  return <LoadingState label={t("Loading…")} />;
}
function MapLoading() {
  const t = useT();
  return <LoadingState label={t("Loading…")} variant="map" lines={2} />;
}
const AnswerEditor = dynamic(
  () => import("./answer-editor").then((module) => module.AnswerEditor),
  { loading: EditorLoading },
);
const StageReviewForm = dynamic(
  () => import("./stage-review-form").then((module) => module.StageReviewForm),
  { loading: EditorLoading },
);
const JourneyMiniview = dynamic(() => import("@/features/guidance/components/journey-miniview"), {
  ssr: false,
  loading: MapLoading,
});
const symbols: Record<string, IconName> = {
  unanswered: "unanswered",
  draft: "draft",
  answered: "answered",
  skipped: "skipped",
  blocked: "warning",
};
function levels(stage: FlowStage) {
  const depth = new Map<string, number>();
  for (const node of stage.nodes)
    depth.set(
      node.id,
      node.after.length ? Math.max(...node.after.map((id) => depth.get(id) ?? 0)) + 1 : 0,
    );
  return [...new Set(depth.values())].map((level) =>
    stage.nodes.filter((n) => depth.get(n.id) === level),
  );
}
export function Journey({
  projectId,
  guidance,
  stageId,
  nodeId,
  history = [],
  names = {},
  preview = false,
  sidebar,
  discussion,
  tasks,
  artifacts,
}: {
  projectId: string;
  guidance: Guidance;
  stageId?: string | undefined;
  nodeId?: string | undefined;
  history?: Revision[];
  names?: Record<string, string>;
  preview?: boolean;
  sidebar?: React.ReactNode;
  discussion?: React.ReactNode;
  tasks?: React.ReactNode;
  artifacts?: React.ReactNode;
}) {
  const t = useT();
  const [showMap, setShowMap] = useState(false);
  const { flow, answers, reviews } = guidance;
  const base = preview ? "/preview" : `/projects/${projectId}`;
  const href = (stage?: string, node?: string) =>
    `${base}${stage ? `?stage=${stage}` : ""}${node ? `&node=${node}` : ""}`;
  const questions = flow.stages.flatMap((s) => s.nodes).filter((n) => n.kind === "question");
  const answered = questions.filter((n) =>
    answers.some((a) => a.node_id === n.id && a.status === "answered"),
  ).length;
  const skipped = answers.filter((a) => a.status === "skipped").length;
  const blocked = answers.filter((a) => a.status === "blocked").length;
  const activeStage = stageId ? flow.stages.find((s) => s.id === stageId) : undefined;
  if (stageId && !activeStage) notFound();
  const activeNode = nodeId ? activeStage?.nodes.find((n) => n.id === nodeId) : undefined;
  if (nodeId && !activeNode) notFound();
  const current = answers.find((a) => a.node_id === nodeId);
  const next = flow.stages
    .flatMap((stage) => stage.nodes.map((node) => ({ stage, node })))
    .find(
      ({ node }) =>
        node.kind === "question" &&
        !answers.some((a) => a.node_id === node.id && ["answered", "skipped"].includes(a.status)),
    );
  const review = reviews.find((r) => r.stage_id === stageId);
  const progressControls = (
    <div className={"journey-progress-controls flex items-center gap-[12px] shrink-0"}>
      <Button
        type="button"
        className={
          'button secondary miniview-icon items-center justify-center gap-3 min-h-12 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] [&[aria-expanded="true"]]:bg-lime [&[aria-expanded="true"]]:text-bg grid place-items-center w-11 h-11 min-w-11 p-0 rounded-full'
        }
        aria-label={showMap ? t("Hide 3D mini-view") : t("Show 3D mini-view")}
        title={showMap ? t("Hide 3D mini-view") : t("Show 3D mini-view")}
        aria-haspopup="dialog"
        aria-expanded={showMap}
        aria-controls="project-stage-map"
        onClick={() => setShowMap(!showMap)}
      >
        <Icon name="box" />
      </Button>
      <div
        className={
          "progress-ring w-14.5 h-14.5 grid place-items-center [background:conic-gradient(var(--color-lime)_var(--progress),_#304336_0)] rounded-full lg:compact:w-10.5 lg:compact:h-10.5"
        }
        style={
          {
            "--progress": `${questions.length ? (answered / questions.length) * 100 : 0}%`,
          } as React.CSSProperties
        }
      >
        <span
          aria-hidden="true"
          className={
            "grid place-items-center w-12.5 h-12.5 bg-bg rounded-full text-[28px] text-lime lg:compact:w-9 lg:compact:h-9 lg:compact:text-[21px]"
          }
        >
          <WaveMark />
        </span>
      </div>
    </div>
  );
  return (
    <div
      className={[
        `workspace-columns journey-workspace${discussion ? " has-discussion" : ""}`,
        '[&_>_.project-discussion-column]:[grid-column:1] [&_>_.project-discussion-column]:[grid-row:2] [&_>_.project-discussion-column]:min-w-0 [&_>_.project-discussion-column_>_.discussion]:mt-0 min-[1280px]:[&_>_.project-discussion-column]:[grid-row:1] min-[1280px]:[&_>_.project-discussion-column]:sticky min-[1280px]:[&_>_.project-discussion-column]:top-5 min-[1280px]:[&_>_.project-discussion-column]:max-h-[calc(100dvh_-_40px)] grid grid-cols-[1.3fr_1fr] gap-8 items-start max-[1000px]:grid-cols-[1fr_1fr] max-[700px]:grid-cols-[1fr] lg:compact:grid-cols-[minmax(0,_1fr)_300px] lg:compact:gap-5 lg:compact:[&_>_*]:min-w-0 min-[2000px]:compact:grid-cols-[minmax(0,_1fr)_340px] min-[2000px]:compact:gap-7 min-[1280px]:grid-cols-[clamp(240px,_20vw,_380px)_minmax(0,_1fr)_clamp(220px,_18vw,_340px)] min-[1280px]:gap-5 min-[1280px]:compact:grid-cols-[clamp(240px,_20vw,_380px)_minmax(0,_1fr)_clamp(220px,_18vw,_340px)] min-[1280px]:compact:gap-5 mt-5 [&.panel]:p-3 [&_>_h2]:text-[14px] [&_>_h2]:leading-[1.35] [&_>_h2]:mt-0 [&_>_h2]:mx-0 [&_>_h2]:mb-1 [&_>_.muted]:text-[10px] [&_>_.muted]:leading-[1.45] [&_>_.muted]:mt-0 [&_>_.muted]:mx-0 [&_>_.muted]:mb-3 [&_.comment-item]:flex [&_.comment-item]:p-0 [&_.comment-item]:border-0 [&_.comment-item]:min-w-0 [&_.comment-body]:text-ink [&_.comment-body]:my-0.5 [&_.comment-body]:mx-0 [&_.comment-body]:text-[12px] [&_.comment-body]:leading-[1.45] [&_.comment-compose_textarea]:min-h-9.5 [&_.comment-compose_textarea]:max-h-40 [&_.comment-compose_textarea]:py-1.75 [&_.comment-compose_textarea]:px-2.25 [&_.comment-compose_textarea]:text-[12px] [&_.comment-compose_textarea]:leading-[1.4] [&_.comment-compose_textarea]:rounded-[14px] [&_.comment-compose_>_button]:[grid-column:2] [&_.comment-compose_>_button]:[grid-row:2] [&_.comment-compose_>_button]:w-9 [&_.comment-compose_>_button]:min-h-9 [&_.comment-compose_>_button]:p-2 [&_.comment-compose_>_button]:rounded-full [&_.comment-edit]:gap-1.5 [&_.comment-edit_textarea]:text-[12px] [&_.comment-edit_textarea]:p-1.75 [&_.comment-controls]:my-1.25 [&_.comment-controls]:mx-0 [&_.comment-controls]:gap-1 [&_.comment-controls_button]:min-h-7 [&_.comment-controls_button]:text-[10px] [&_.comment-controls_button]:py-1 [&_.comment-controls_button]:px-1.75 [&_.comment-confirm_p]:text-[11px] [&_.comment-confirm_p]:my-1.25 [&_.comment-confirm_p]:mx-0 pointer-coarse:[&_.comment-compose_>_button]:w-11 pointer-coarse:[&_.comment-compose_>_button]:min-h-11 pointer-coarse:[&_.comment-controls_button]:min-h-11 [&_.comment-compose_>_textarea]:[grid-column:2] [&_.comment-compose_>_textarea]:[grid-row:2] [&_.comment-compose_>_button[type="submit"]]:[grid-column:3] [&_.comment-compose_>_.comment-reference-trigger]:[grid-column:1] [&_.comment-compose_>_.comment-reference-trigger]:[grid-row:2] [&_.comment-compose_>_.comment-reference-trigger]:w-7.5 [&_.comment-compose_>_.comment-reference-trigger]:min-h-9 [&_.comment-compose_>_.comment-reference-trigger]:p-1.25',
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showMap && (
        <StageMapPopup onClose={() => setShowMap(false)}>
          <JourneyMiniview guidance={guidance} base={base} stageId={stageId} nodeId={nodeId} />
        </StageMapPopup>
      )}
      <div
        className={
          "project-working-column min-w-0 bg-panel border border-line rounded-[10px] p-4 lg:compact:py-3.5 lg:compact:px-4 [grid-column:1] [grid-row:1] min-[1280px]:[grid-column:2]"
        }
      >
        <ProjectWork tasks={tasks} artifacts={artifacts}>
          <section
            className={[
              `journey${activeStage ? " has-stage-rail" : ""}`,
              "min-w-0 lg:grid lg:grid-cols-[150px_minmax(0,_1fr)] lg:gap-4.5 lg:items-start lg:[&_.desktop-stage-nav_.stage-rail-link.reviewed_.rail-label_small]:text-lime lg:[&_.desktop-stage-nav_.stage-rail-link.revisit_.rail-label_small]:[color:#d5df8a] lg:[&.has-stage-rail_.journey-content_.node-tree]:mt-0 lg:compact:[&.has-stage-rail_.journey-content_.node-tree]:mt-0",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {activeStage && (
              <header
                className={
                  "journey-stage-heading min-w-0 mb-2.5 [&_>_.muted]:m-0 [&_>_.muted]:text-[12px] lg:[grid-column:1_/_-1] lg:[margin:0]"
                }
              >
                <nav
                  className={
                    'journey-breadcrumb items-center max-[700px]:gap-3.5 max-[700px]:text-[12px] flex flex-wrap text-muted gap-2.5 my-6.5 lg:compact:my-3.5 [&_[aria-current="page"]]:inline-flex [&_[aria-current="page"]]:items-center [&_[aria-current="page"]]:gap-1.5 [&_[aria-current="page"]]:py-1.5 [&_[aria-current="page"]]:px-2 [&_[aria-current="page"]]:min-h-8 [&_[aria-current="page"]]:rounded-[6px] [&_[aria-current="page"]]:leading-[1.4] [&_[aria-current="page"]]:wrap-anywhere [&_[aria-current="page"]]:text-ink [&_[aria-current="page"]]:bg-[#22372f] [&_[aria-current="page"]]:border [&_[aria-current="page"]]:border-line [&_[aria-current="page"]]:font-semibold [&_svg]:shrink-0 mt-0 mx-0 mb-1.5 text-[11px] lg:compact:mb-2'
                  }
                  aria-label={t("Project path")}
                >
                  <ol className={"flex items-center flex-wrap gap-[4px] list-none m-0 p-0"}>
                    <li className={"min-w-[0]"}>
                      <Link
                        href={base}
                        className={
                          "no-underline [text-underline-offset:4px] inline-flex items-center gap-1.5 py-1.5 px-2 min-h-8 rounded-[6px] leading-[1.4] wrap-anywhere text-muted [transition:background_0.15s,_color_0.15s] pointer-coarse:min-h-11 [&:hover]:bg-[#22372f] [&:hover]:text-lime"
                        }
                      >
                        <Icon name="overview" />
                        {t("All stages")}
                      </Link>
                    </li>
                    <li
                      className={[
                        "breadcrumb-separator",
                        "min-w-0 text-muted opacity-[0.6] [padding-inline:2px] text-[18px]",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-hidden="true"
                    >
                      <Icon name="chevronRight" />
                    </li>
                    <li className={"min-w-[0]"}>
                      {activeNode ? (
                        <Link
                          href={href(activeStage.id)}
                          className={
                            "no-underline [text-underline-offset:4px] inline-flex items-center gap-1.5 py-1.5 px-2 min-h-8 rounded-[6px] leading-[1.4] wrap-anywhere text-muted [transition:background_0.15s,_color_0.15s] pointer-coarse:min-h-11 [&:hover]:bg-[#22372f] [&:hover]:text-lime"
                          }
                        >
                          {t(activeStage.name)}
                        </Link>
                      ) : (
                        <span aria-current="page">{t(activeStage.name)}</span>
                      )}
                    </li>
                    {activeNode && (
                      <>
                        <li
                          className={[
                            "breadcrumb-separator",
                            "min-w-0 text-muted opacity-[0.6] [padding-inline:2px] text-[18px]",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-hidden="true"
                        >
                          <Icon name="chevronRight" />
                        </li>
                        <li className={"min-w-[0]"}>
                          <span aria-current="page">{t(activeNode.label)}</span>
                        </li>
                      </>
                    )}
                  </ol>
                </nav>
                <div
                  className={
                    "stage-heading-row flex items-center justify-between gap-4 [&_.progress-ring]:w-8 [&_.progress-ring]:h-8 [&_.progress-ring_span]:w-6.75 [&_.progress-ring_span]:h-6.75 [&_.progress-ring_span]:text-[17px] [&_.journey-progress-controls]:gap-2 [&_.journey-progress-controls_.miniview-icon]:w-8 [&_.journey-progress-controls_.miniview-icon]:h-8 [&_.journey-progress-controls_.miniview-icon]:min-h-8 [&_.journey-progress-controls_.miniview-icon]:min-w-8 [&_.journey-progress-controls_.miniview-icon]:p-0 [&_.journey-progress-controls_.miniview-icon]:rounded-[6px] [&_.miniview-icon_svg]:w-4.5 [&_.miniview-icon_svg]:h-4.5 pointer-coarse:[&_.journey-progress-controls_.miniview-icon]:w-11 pointer-coarse:[&_.journey-progress-controls_.miniview-icon]:h-11 pointer-coarse:[&_.journey-progress-controls_.miniview-icon]:min-w-11 pointer-coarse:[&_.journey-progress-controls_.miniview-icon]:min-h-11"
                  }
                >
                  <h2
                    className={
                      "font-mono font-medium lg:compact:text-[19px] lg:compact:mt-0 lg:compact:mx-0 lg:compact:mb-3 tracking-[-0.2px] min-w-0 m-0 text-[14px] leading-[1.3]"
                    }
                  >
                    {t(activeStage.question)}
                  </h2>
                  {progressControls}
                </div>
              </header>
            )}
            {activeStage && (
              <nav
                className={
                  "desktop-stage-nav items-center gap-7 text-[13px] max-[700px]:gap-3.5 max-[700px]:text-[12px] hidden lg:compact:flex-wrap lg:flex lg:flex-col lg:[flex-wrap:nowrap] lg:gap-1.5 lg:m-0 lg:sticky lg:top-5 lg:items-stretch lg:compact:flex lg:compact:flex-col lg:compact:[flex-wrap:nowrap] lg:compact:gap-1.5 lg:compact:m-0 lg:compact:sticky lg:compact:top-5 lg:compact:items-stretch"
                }
                aria-label={t("All stages")}
              >
                {flow.stages.map((stage, index) => {
                  const questions = stage.nodes.filter((node) => node.kind === "question");
                  const saved = answers.filter((answer) =>
                    stage.nodes.some((node) => node.id === answer.node_id),
                  );
                  const answered = questions.filter((node) =>
                    saved.some(
                      (answer) => answer.node_id === node.id && answer.status === "answered",
                    ),
                  ).length;
                  const revisit = saved.some((answer) => answer.needs_review);
                  const reviewed =
                    reviews.some((review) => review.stage_id === stage.id && review.reviewed) &&
                    !revisit;
                  const started = saved.some((answer) => answer.status !== "unanswered");
                  const status = reviewed ? "✓ Reviewed" : started ? "In progress" : "Not started";
                  return (
                    <Link
                      key={stage.id}
                      href={href(stage.id)}
                      className={[
                        `stage-rail-link${reviewed ? " reviewed" : ""}${revisit ? " revisit" : ""}`,
                        'lg:flex lg:items-center lg:[flex:none] lg:gap-2 lg:min-h-11 lg:py-2 lg:px-2.5 lg:border lg:border-line lg:rounded-[6px] lg:text-[12px] lg:wrap-anywhere lg:[justify-content:flex-start] lg:compact:min-h-11 lg:compact:wrap-anywhere lg:compact:[justify-content:flex-start] lg:compact:[flex:1] lg:compact:flex lg:compact:items-center lg:compact:gap-2 lg:compact:py-2 lg:compact:px-2.5 lg:compact:border lg:compact:border-line lg:compact:rounded-[6px] lg:compact:text-[12px] lg:[&[aria-current="step"]]:border-lime lg:[&[aria-current="step"]]:bg-[#2b4030] lg:bg-[#2a4034] lg:[border-color:#637a55] lg:compact:bg-[#2a4034] lg:compact:[border-color:#637a55] lg:[&.stage-rail-link[aria-current="step"]]:bg-[#405b39] lg:[&.stage-rail-link[aria-current="step"]]:border-lime lg:[&.stage-rail-link[aria-current="step"]]:[box-shadow:inset_3px_0_var(--color-lime)] lg:compact:[&.stage-rail-link[aria-current="step"]]:bg-[#405b39] lg:compact:[&.stage-rail-link[aria-current="step"]]:border-lime lg:compact:[&.stage-rail-link[aria-current="step"]]:[box-shadow:inset_3px_0_var(--color-lime)] lg:compact:[&[aria-current="step"]]:border-lime lg:compact:[&[aria-current="step"]]:bg-[#2b4030]',
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={stage.id === activeStage.id ? "step" : undefined}
                      title={`${t(status)} · ${answered}/${questions.length} ${t("questions answered")}${revisit ? t(" · revisit") : ""}`}
                    >
                      <span
                        className={[
                          "rail-number",
                          "lg:compact:[font:10px_monospace] lg:compact:text-lime lg:[font:10px_monospace] lg:shrink-0 lg:text-lime",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className={["rail-label", "lg:min-w-[0]"].filter(Boolean).join(" ")}>
                        <strong className={"lg:block lg:text-[12px] lg:font-semibold"}>
                          {t(stage.name)}
                        </strong>
                        <small
                          className={
                            "lg:block lg:mt-0.75 lg:text-muted lg:text-[9px] lg:leading-[1.4]"
                          }
                        >
                          {answered}/{questions.length} · {t(status)}
                          {revisit ? t(" · revisit") : ""}
                        </small>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            )}
            <div
              className={
                "journey-content [&_>_.button.secondary]:text-[11px] [&_>_.button.secondary]:min-h-7.5 [&_>_.button.secondary]:py-1.5 [&_>_.button.secondary]:px-2.5 pointer-coarse:[&_>_.button.secondary]:min-h-11 min-w-0"
              }
            >
              {!activeStage ? (
                <>
                  <p
                    className={
                      "journey-hint text-[11px] text-muted my-3 mx-0 lg:compact:text-[10.5px] lg:compact:my-1.5"
                    }
                  >
                    {t("Select a stage to view its questions.")}{" "}
                  </p>
                  <ol
                    className={
                      'stage-list list-none p-0 my-6 mx-0 [&_>_li]:relative [&_>_li]:pb-4.5 [&_>_li:not(:last-child):after]:[content:""] [&_>_li:not(:last-child):after]:w-0.25 [&_>_li:not(:last-child):after]:h-4.5 [&_>_li:not(:last-child):after]:bg-[#688454] [&_>_li:not(:last-child):after]:absolute [&_>_li:not(:last-child):after]:bottom-0 [&_>_li:not(:last-child):after]:left-8.5 lg:compact:my-2 lg:compact:[&_>_li]:pb-1.5 lg:compact:[&_>_li:not(:last-child)::after]:h-1.5 lg:compact:[&_>_li:not(:last-child)::after]:left-5.5'
                    }
                  >
                    {flow.stages.map((stage, i) => {
                      const questions = stage.nodes.filter((n) => n.kind === "question");
                      const count = questions.filter((n) =>
                        answers.some((a) => a.node_id === n.id && a.status === "answered"),
                      ).length;
                      const reviewed = reviews.some((r) => r.stage_id === stage.id && r.reviewed);
                      return (
                        <li key={stage.id}>
                          <Link
                            href={href(stage.id)}
                            className={
                              "stage-card flex gap-4.5 items-start py-6 px-5 border border-line rounded-[12px] [background:linear-gradient(115deg,_#20332a,_#182725)] hover:[border-color:#9eb97b] lg:compact:py-2 lg:compact:px-3 lg:compact:gap-2.5 lg:compact:items-center lg:compact:rounded-[7px]"
                            }
                          >
                            <span
                              className={
                                "stage-number [font:10.5px_monospace] text-lime pt-0.5 lg:compact:pt-0 lg:compact:text-[10px]"
                              }
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div
                              className={
                                "lg:compact:[flex:1] lg:compact:grid lg:compact:grid-cols-[96px_minmax(0,_1fr)_150px] lg:compact:items-center lg:compact:gap-[2px_10px] lg:max-[1399.02px]:compact:grid-cols-[90px_minmax(0,_1fr)] lg:max-[1399.02px]:compact:gap-[2px_10px] min-[2000px]:compact:grid-cols-[170px_minmax(0,_1fr)_230px] min-[1280px]:compact:grid-cols-[minmax(0,_1fr)]"
                              }
                            >
                              <span
                                className={
                                  "stage-label text-[10px] text-lime uppercase tracking-[1.2px] lg:compact:text-[9px] lg:compact:tracking-[0.8px] lg:max-[1399.02px]:compact:[grid-row:1_/_3] min-[1280px]:compact:[grid-row:auto]"
                                }
                              >
                                {t(stage.name)}
                              </span>
                              <h2
                                className={
                                  "font-mono font-medium text-[15px] leading-[1.3] mt-1 mx-0 mb-1.5 tracking-[-0.3px] max-[700px]:text-[14px] lg:compact:text-[12.5px] lg:compact:m-0 lg:compact:leading-[1.25] lg:compact:tracking-[-0.15px]"
                                }
                              >
                                {t(stage.question)}
                              </h2>
                              <small
                                className={
                                  "text-[9.5px] text-muted lg:compact:leading-[1.25] lg:max-[1399.02px]:compact:[grid-column:2] min-[1280px]:compact:[grid-column:1]"
                                }
                              >
                                {reviewed
                                  ? t("✓ Reviewed")
                                  : count
                                    ? t("In progress")
                                    : t("Not started")}{" "}
                                · {count}/{questions.length} {t("questions answered")}{" "}
                              </small>
                            </div>
                            <span
                              className={
                                "stage-arrow ml-[auto] text-lime [&_svg]:w-3.5 [&_svg]:h-3.5"
                              }
                              aria-hidden="true"
                            >
                              <Icon name="arrowUpRight" />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                  {next && (
                    <Link
                      className={
                        "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
                      }
                      href={href(next.stage.id, next.node.id)}
                    >
                      {t("Next unanswered question:")} {t(next.node.label)}{" "}
                      <Icon name="arrowUpRight" />
                    </Link>
                  )}
                </>
              ) : (
                <>
                  {activeNode ? (
                    preview ? (
                      <Panel className={"answer-panel max-[700px]:p-5 bg-[#14221f]"}>
                        <span
                          className={
                            "eyebrow text-[10px] tracking-[2px] text-lime font-bold block mb-5.5 [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px]"
                          }
                        >
                          {t("READ-ONLY EXAMPLE")}
                        </span>
                        <h2
                          className={
                            "mb-[0.83em] mt-0 font-mono font-medium text-[16px] leading-[1.3] tracking-[-0.25px] lg:compact:my-1.5 lg:compact:mx-0 lg:compact:text-[14px] [&:focus]:[outline:none]"
                          }
                        >
                          {t(activeNode.question)}
                        </h2>
                        <details
                          className={
                            "example bg-[#263a2c] [border-left:2px_solid_#adc57f] py-3.5 px-4.5 my-6 mx-0 [&_small]:text-[10px] [&_small]:text-muted lg:compact:py-2 lg:compact:px-3 lg:compact:my-3"
                          }
                          open
                        >
                          <summary
                            className={
                              "focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] text-[13px] cursor-pointer"
                            }
                          >
                            {t("Example")}
                          </summary>
                          <p
                            className={
                              "text-[13px] mt-3.5 mx-0 mb-2 lg:compact:mt-2 lg:compact:mb-1.25"
                            }
                          >
                            {t(activeNode.example)}
                          </p>
                        </details>
                        <p className={"mb-[1em] mt-[0]"}>
                          {current?.content
                            ? t(current.content)
                            : t(
                                "No answer yet. In your project, this is a place for an answer, an uncertainty, or what you learned.",
                              )}
                        </p>
                        <Link
                          href={href(activeStage.id)}
                          className={
                            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
                          }
                        >
                          {t("Back to this stage")}{" "}
                        </Link>
                      </Panel>
                    ) : (
                      <AnswerEditor
                        key={activeNode.id}
                        projectId={projectId}
                        node={activeNode}
                        answer={current}
                        history={history}
                        names={names}
                        backHref={href(activeStage.id)}
                      />
                    )
                  ) : (
                    <section
                      className={
                        "stage-expanded [&_>_h2]:text-[15px] [&_>_h2]:mt-4 lg:compact:[&_>_h2]:mt-3 lg:compact:[&_>_h2]:mx-0 lg:compact:[&_>_h2]:mb-2 lg:compact:[&_>_.muted]:my-2 lg:compact:[&_>_.muted]:mx-0"
                      }
                    >
                      <div
                        className={
                          "node-tree flex flex-col gap-4 my-4.5 mx-0 lg:compact:gap-3.5 lg:compact:my-3.5"
                        }
                      >
                        {levels(activeStage).map((row, i) => (
                          <div
                            key={i}
                            className={
                              'tree-row grid grid-cols-[repeat(auto-fit,_minmax(145px,_1fr))] gap-2.5 relative [&:not(:first-child)::before]:[content:"↓"] [&:not(:first-child)::before]:absolute [&:not(:first-child)::before]:top-[-19px] [&:not(:first-child)::before]:left-[49%] [&:not(:first-child)::before]:[color:#9cad82] [&:not(:first-child)::before]:text-[12px] [&:not(:first-child)::before]:leading-[16px] lg:compact:[&:not(:first-child)::before]:top-[-16px] lg:compact:[&:not(:first-child)::before]:leading-[14px] min-[2000px]:compact:grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] max-[700px]:grid-cols-[minmax(0,_1fr)]'
                            }
                          >
                            {row.map((node) => {
                              const answer = answers.find((a) => a.node_id === node.id);
                              return (
                                <Link
                                  key={node.id}
                                  href={href(activeStage.id, node.id)}
                                  className={[
                                    `question-node ${answer?.status ?? "unanswered"}`,
                                    "grid flex-col gap-[3px_10px] border border-line rounded-[7px] py-2.25 px-3 bg-[#1c3028] wrap-anywhere grid-cols-[minmax(0,_1fr)_auto] [align-content:center] items-center min-h-11 [&.answered]:[border-color:#738d50] [&.blocked]:[border-color:#b59769] hover:[background:#284332] max-[700px]:p-3.5 lg:compact:py-1.75 lg:compact:px-2.5 lg:compact:gap-[2px_10px] lg:compact:rounded-[8px]",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  <span
                                    className={
                                      "node-state [text-transform:capitalize] text-lime [grid-column:2] [grid-row:1] text-[9px] text-right"
                                    }
                                  >
                                    <Icon
                                      name={symbols[answer?.status ?? "unanswered"] ?? "unanswered"}
                                      size={12}
                                    />{" "}
                                    {t(answer?.status ?? "unanswered")}
                                    {answer?.needs_review ? t(" · revisit") : ""}
                                  </span>
                                  <strong
                                    className={
                                      "text-[13px] leading-[1.4] [grid-column:1] [grid-row:1]"
                                    }
                                  >
                                    {t(node.label)}
                                  </strong>
                                  <small
                                    className={[
                                      "node-type",
                                      "text-muted [grid-column:2] [grid-row:2] text-[9px] text-right",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  >
                                    {t(node.kind)}
                                  </small>
                                  {node.after.length > 0 && (
                                    <small
                                      className={
                                        "node-after max-[700px]:hidden text-muted text-[9px] border-t-line [grid-column:1] [grid-row:2] border-0 p-0 leading-[1.4]"
                                      }
                                    >
                                      {t("After:")}{" "}
                                      {node.after
                                        .map((id) =>
                                          t(
                                            activeStage.nodes.find((n) => n.id === id)?.label ?? "",
                                          ),
                                        )
                                        .join(" + ")}
                                    </small>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {activeStage.id === "building" && (
                        <p
                          className={"loop-links text-[12px] text-muted my-6 mx-0 lg:compact:my-3"}
                        >
                          {t("Need help or another round?")}{" "}
                          <Link
                            href={href("building", "next-task")}
                            className={"text-lime underline"}
                          >
                            {t("Return to the next task ↶")}{" "}
                          </Link>
                        </p>
                      )}
                      {activeStage.id === "experiment" && (
                        <p
                          className={"loop-links text-[12px] text-muted my-6 mx-0 lg:compact:my-3"}
                        >
                          {t("Trying another direction?")}{" "}
                          <Link
                            href={href("experiment", "rough-version")}
                            className={"text-lime underline"}
                          >
                            {t("Test another prototype ↶")}{" "}
                          </Link>
                        </p>
                      )}
                      {activeStage.id === "create" && (
                        <p
                          className={"loop-links text-[12px] text-muted my-6 mx-0 lg:compact:my-3"}
                        >
                          {t("Not finished enough?")}{" "}
                          <Link
                            href={href("create", "next-piece")}
                            className={"text-lime underline"}
                          >
                            {t("Make the next piece ↶")}{" "}
                          </Link>
                        </p>
                      )}
                      {activeStage.id === "validation" && (
                        <p
                          className={"loop-links text-[12px] text-muted my-6 mx-0 lg:compact:my-3"}
                        >
                          {t("Revising the idea?")}{" "}
                          <Link href={href("exploration")} className={"text-lime underline"}>
                            {t("Revisit Exploration ↶")}
                          </Link>
                        </p>
                      )}
                      {review && (
                        <div
                          className={
                            "review-note text-[13px] bg-[#3c3e28] p-3.75 rounded-[8px] lg:compact:p-2.5 lg:compact:my-2.5 lg:compact:mx-0"
                          }
                        >
                          <strong>
                            {review.reviewed
                              ? t("✓ Stage reviewed")
                              : t("↶ Revisit this review after earlier changes")}
                          </strong>
                          <p
                            className={
                              "preserve-lines whitespace-pre-wrap wrap-anywhere mt-[12px] mx-[0] mb-[0]"
                            }
                          >
                            {review.rationale}
                          </p>
                        </div>
                      )}
                      {!preview && (
                        <StageReviewForm
                          projectId={projectId}
                          stageId={activeStage.id}
                          contentRevision={guidance.contentRevision}
                        />
                      )}
                    </section>
                  )}
                </>
              )}
            </div>
          </section>
        </ProjectWork>
      </div>
      {discussion && (
        <div
          className={
            "project-discussion-column min-[1280px]:[&_>_.discussion]:flex min-[1280px]:[&_>_.discussion]:flex-col min-[1280px]:[&_>_.discussion]:max-h-[calc(100dvh_-_40px)] min-[1280px]:[&_>_.discussion]:overflow-y-auto min-[1280px]:[&_.comment-list]:min-h-0 min-[1280px]:[&_.comment-list]:overflow-y-auto min-[1280px]:[&_.comment-list]:[flex:1_1_auto] min-[1280px]:[&_.comment-compose]:[flex:0_0_auto] min-[1280px]:[&_.comment-meta]:flex-wrap my-3 mx-0 [color:#c4d2ca] justify-end text-[10px] leading-[1.3] grid grid-cols-[auto_minmax(0,_1fr)_auto] items-end gap-[5px_8px] mt-3 pt-2.25 border-t border-t-line"
          }
        >
          {discussion}
        </div>
      )}
      <div
        className={
          "project-sidebar grid gap-4 min-w-0 [align-content:start] [&_.project-settings]:mb-0 [grid-column:2] [grid-row:1_/_span_2] max-[700px]:[grid-column:1] max-[700px]:[grid-row:3] min-[1280px]:[grid-column:3] min-[1280px]:[grid-row:1]"
        }
      >
        <details
          open
          className="panel journey-progress-panel p-4 bg-panel border border-line rounded-[10px] min-w-0 [&_.journey-progress-controls]:ml-auto"
          aria-label={t("Questions answered, not proof of success")}
        >
          <summary className="cursor-pointer select-none [[open]>&]:mb-3">
            <h2 className="inline-flex items-center m-0 text-[14px] leading-[1.3]">
              {t("Progress")}{" "}
              <span className="count text-[10px] px-1.5 py-0.5 ml-1.25">
                {answered}/{questions.length}
              </span>
            </h2>
          </summary>
          <div
            className={
              "journey-summary flex items-center justify-between gap-3 [&_.eyebrow]:mb-2.5 lg:compact:mb-2.5 lg:compact:[&_.eyebrow]:m-0 flex-wrap mb-3.5"
            }
          >
            <div
              className={
                "[&:first-child]:grid [&:first-child]:gap-1 lg:compact:[&:first-child]:flex lg:compact:[&:first-child]:items-center lg:compact:[&:first-child]:flex-wrap lg:compact:[&:first-child]:gap-[8px_18px]"
              }
            >
              <p className={"text-[15px] lg:compact:text-[13px] m-0"}>
                <strong className={"text-[24px] text-lime lg:compact:text-[18px]"}>
                  {answered}
                </strong>{" "}
                {t("of")} {questions.length} {t("questions answered")}{" "}
              </p>
              <small className={"text-muted text-[11px]"}>
                {skipped} {t("skipped ·")} {blocked} {t("blocked ·")}{" "}
                {t(guidance.projectState.replaceAll("_", " "))}
              </small>
            </div>
            {!activeStage && progressControls}
          </div>
          <div
            className={"progress-track h-[4px] bg-[#2f4337] rounded-[4px] overflow-hidden"}
            role="progressbar"
            aria-label={t("Questions answered, not proof of success")}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={answered}
          >
            <span
              style={{ width: `${(answered / questions.length) * 100}%` }}
              className={"h-[100%] block bg-lime"}
            />
          </div>
        </details>
        {sidebar}
      </div>
    </div>
  );
}
