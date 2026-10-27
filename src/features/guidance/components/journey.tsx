"use client";
import { Icon, type IconName } from "@/shared/ui/icon";
import { Panel } from "@/shared/ui/panel";

import { Button } from "@/shared/ui/button";

import { ProjectWork } from "@/features/projects/components/project-work";
import { WaveMark } from "@/shared/ui/wave-mark";

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
// Keep lazy loading inside its own boundary so the focused map trigger stays mounted.
const StageMapPopup = dynamic(
  () => import("./stage-map-popup").then((module) => module.StageMapPopup),
  { loading: () => null },
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
  wideWork = false,
  productionStages = [],
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
  wideWork?: boolean;
  productionStages?: string[];
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
    <div className={"journey-progress-controls flex items-center gap-3 shrink-0"}>
      <Button
        type="button"
        className={
          'button secondary miniview-icon [&[aria-expanded="true"]]:bg-lime [&[aria-expanded="true"]]:text-bg grid place-items-center w-11 h-11 min-w-11 p-0 rounded-full'
        }
        aria-label={showMap ? t("Hide 3D mini-view") : t("Show 3D mini-view")}
        title={showMap ? t("Hide 3D mini-view") : t("Show 3D mini-view")}
        aria-haspopup="dialog"
        aria-expanded={showMap}
        aria-controls="project-stage-map"
        onClick={() => setShowMap(!showMap)}
        variant="secondary"
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
        wideWork &&
          "[&_.project-working-column]:col-span-full! [&_.project-working-column]:col-start-1! [&_.project-working-column]:row-start-1! [&_.project-discussion-column]:row-start-2! [&_.project-discussion-column]:col-start-1! [&_.project-discussion-column]:static! [&_.project-sidebar]:row-start-2! [&_.project-sidebar]:col-start-8! max-[700px]:[&_.project-sidebar]:row-start-3! max-[700px]:[&_.project-sidebar]:col-start-1!",
        "grid w-full max-w-full grid-cols-1 min-[701px]:grid-cols-12 gap-3 lg:compact:gap-3 items-start",
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
        className={[
          "project-working-column min-w-0 max-w-full overflow-hidden bg-panel border border-line rounded-[10px] p-4 lg:compact:py-2.5 lg:compact:px-3 col-span-1 col-start-1 row-start-1 min-[701px]:col-span-7 min-[1001px]:col-span-8",
          discussion && "min-[1280px]:col-span-8 min-[1280px]:col-start-3 min-[1280px]:row-start-1",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <ProjectWork tasks={tasks} artifacts={artifacts}>
          <section
            className={[
              `journey${activeStage ? " has-stage-rail" : ""}`,
              "min-w-0",
              activeStage &&
                "lg:grid lg:grid-cols-[136px_minmax(0,_1fr)] lg:gap-3.5 lg:items-start",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {activeStage && (
              <header
                className={
                  "journey-stage-heading min-w-0 mb-2.5 [&_>_.muted]:m-0 [&_>_.muted]:text-[12px] lg:[grid-column:1_/_-1] lg:m-0"
                }
              >
                <nav
                  className={
                    'journey-breadcrumb items-center max-[700px]:gap-3.5 max-[700px]:text-[12px] flex flex-wrap text-muted gap-2.5 my-6.5 lg:compact:my-3.5 [&_[aria-current="page"]]:inline-flex [&_[aria-current="page"]]:items-center [&_[aria-current="page"]]:gap-1.5 [&_[aria-current="page"]]:py-1.5 [&_[aria-current="page"]]:px-2 [&_[aria-current="page"]]:min-h-8 [&_[aria-current="page"]]:rounded-[6px] [&_[aria-current="page"]]:leading-[1.4] [&_[aria-current="page"]]:wrap-anywhere [&_[aria-current="page"]]:text-ink [&_[aria-current="page"]]:bg-[var(--theme-surface,#22372f)] [&_[aria-current="page"]]:border [&_[aria-current="page"]]:border-line [&_[aria-current="page"]]:font-semibold [&_svg]:shrink-0 mt-0 mx-0 mb-1.5 text-[11px] lg:compact:mb-2'
                  }
                  aria-label={t("Project path")}
                >
                  <ol className={"flex items-center flex-wrap gap-1 list-none m-0 p-0"}>
                    <li className={"min-w-0"}>
                      <Link
                        href={base}
                        className={
                          "no-underline underline-offset-4 inline-flex items-center gap-1.5 py-1.5 px-2 min-h-8 rounded-[6px] leading-[1.4] wrap-anywhere text-muted [transition:background_0.15s,_color_0.15s] pointer-coarse:min-h-11 hover:bg-[var(--theme-surface,#22372f)] hover:text-lime"
                        }
                      >
                        <Icon name="overview" />
                        {t("All stages")}
                      </Link>
                    </li>
                    <li
                      className={
                        "breadcrumb-separator min-w-0 text-muted opacity-60 px-0.5 text-[18px]"
                      }
                      aria-hidden="true"
                    >
                      <Icon name="chevronRight" />
                    </li>
                    <li className={"min-w-0"}>
                      {activeNode ? (
                        <Link
                          href={href(activeStage.id)}
                          className={
                            "no-underline underline-offset-4 inline-flex items-center gap-1.5 py-1.5 px-2 min-h-8 rounded-[6px] leading-[1.4] wrap-anywhere text-muted [transition:background_0.15s,_color_0.15s] pointer-coarse:min-h-11 hover:bg-[var(--theme-surface,#22372f)] hover:text-lime"
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
                          className={
                            "breadcrumb-separator min-w-0 text-muted opacity-60 px-0.5 text-[18px]"
                          }
                          aria-hidden="true"
                        >
                          <Icon name="chevronRight" />
                        </li>
                        <li className={"min-w-0"}>
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
                      "font-sans font-medium lg:compact:text-[13px] tracking-[-0.2px] min-w-0 m-0 text-[14px] leading-[1.3] compact:text-[13px]"
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
                  "desktop-stage-nav hidden lg:flex flex-col flex-nowrap items-stretch gap-1.5 m-0 sticky top-5"
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
                        "flex items-center flex-none gap-2 min-h-11 py-2 px-2.5 border border-[var(--theme-border,#637a55)] rounded-[6px] text-[12px] wrap-anywhere justify-start bg-[var(--theme-surface,#2a4034)]",
                        stage.id === activeStage.id &&
                          "border-lime bg-[var(--theme-surface,#405b39)] shadow-[inset_3px_0_var(--color-lime)]",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={stage.id === activeStage.id ? "step" : undefined}
                      title={`${t(status)} · ${answered}/${questions.length} ${t("questions answered")}${revisit ? t(" · revisit") : ""}`}
                    >
                      <span className={"rail-number [font:10px_monospace] shrink-0 text-lime"}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className={"rail-label min-w-0"}>
                        <strong className={"block text-[12px] font-semibold"}>
                          {t(stage.name)}
                        </strong>
                        <small
                          className={`block mt-0.75 text-[11px] leading-[1.4] ${revisit ? "text-[var(--theme-text,#d5df8a)]" : reviewed ? "text-lime" : "text-muted"}`}
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
                      "journey-hint text-[11px] text-muted my-3 mx-0 lg:compact:text-[11px] lg:compact:my-1.5"
                    }
                  >
                    {t("Select a stage to view its questions.")}{" "}
                  </p>
                  <ol
                    className={
                      'stage-list list-none p-0 my-6 mx-0 [&_>_li]:relative [&_>_li]:pb-4.5 [&_>_li:not(:last-child):after]:[content:""] [&_>_li:not(:last-child):after]:w-0.25 [&_>_li:not(:last-child):after]:h-4.5 [&_>_li:not(:last-child):after]:bg-[var(--theme-surface,#688454)] [&_>_li:not(:last-child):after]:absolute [&_>_li:not(:last-child):after]:bottom-0 [&_>_li:not(:last-child):after]:left-8.5 lg:compact:my-2 lg:compact:[&_>_li]:pb-1 lg:compact:[&_>_li:not(:last-child)::after]:h-1.5 lg:compact:[&_>_li:not(:last-child)::after]:left-5.5'
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
                            href={
                              productionStages.includes(stage.id)
                                ? `${base}?view=tasks`
                                : href(stage.id)
                            }
                            className={
                              "stage-card flex gap-4.5 items-start py-6 px-5 border border-line rounded-[12px] min-w-0 max-w-full [background:linear-gradient(115deg,_var(--theme-surface,#20332a),_var(--color-panel))] hover:[border-color:var(--theme-border,#9eb97b)] lg:compact:py-1.5 lg:compact:px-2 lg:compact:gap-2 lg:compact:items-center lg:compact:rounded-[7px]"
                            }
                          >
                            <span
                              className={
                                "stage-number [font:10.5px_monospace] text-lime pt-0.5 shrink-0 lg:compact:pt-0 lg:compact:text-[11px]"
                              }
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div
                              className={
                                "flex-1 min-w-0 lg:compact:grid lg:compact:grid-cols-[minmax(0,_1fr)_auto] lg:compact:items-baseline lg:compact:gap-x-3 lg:compact:gap-y-0.5"
                              }
                            >
                              <span
                                className={
                                  "stage-label text-[11px] text-lime uppercase tracking-[1.2px] break-words lg:compact:col-start-1 lg:compact:row-start-1 lg:compact:text-[11px] lg:compact:tracking-[0.8px] lg:compact:leading-[1.2]"
                                }
                              >
                                {t(stage.name)}
                              </span>
                              <h2
                                className={
                                  "font-sans font-medium text-[15px] leading-[1.3] mt-1 mx-0 mb-1.5 tracking-[-0.3px] min-w-0 break-words max-[700px]:text-[14px] lg:compact:col-span-2 lg:compact:col-start-1 lg:compact:row-start-2 lg:compact:text-[12.5px] lg:compact:m-0 lg:compact:leading-[1.25] lg:compact:tracking-[-0.15px]"
                                }
                              >
                                {t(stage.question)}
                              </h2>
                              <small
                                className={
                                  "text-[11px] text-muted break-words lg:compact:col-start-2 lg:compact:row-start-1 lg:compact:text-right lg:compact:leading-[1.2]"
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
                                "stage-arrow ml-auto shrink-0 text-lime [&_svg]:w-3.5 [&_svg]:h-3.5"
                              }
                              aria-hidden="true"
                            >
                              <Icon name="arrowUpRight" />
                            </span>
                          </Link>
                          {productionStages.includes(stage.id) && (
                            <div className="flex gap-3 text-xs py-1">
                              <Link href={`${base}?view=tasks`}>{t("Open milestone boards")}</Link>
                              <Link href={href(stage.id)}>
                                {t("Earlier stage questions and answers")}
                              </Link>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {next && (
                    <Link
                      className={
                        "button secondary lg:compact:min-h-8.5 lg:compact:py-2 lg:compact:px-3 lg:compact:text-[12px] lg:compact:rounded-[7px] rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[var(--theme-selected,#344c39)] text-lime border border-[var(--theme-border,#658451)] hover:[background:var(--theme-selected,#456248)]"
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
                      <Panel
                        className={
                          "answer-panel max-[700px]:p-5 bg-[var(--theme-surface-low,#14221f)]"
                        }
                      >
                        <span
                          className={
                            "eyebrow text-[11px] tracking-[2px] text-lime font-bold block mb-5.5 [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px]"
                          }
                        >
                          {t("READ-ONLY EXAMPLE")}
                        </span>
                        <h2
                          className={
                            "mb-[0.83em] mt-0 font-sans font-medium text-[16px] leading-[1.3] tracking-[-0.25px] lg:compact:my-1.5 lg:compact:mx-0 lg:compact:text-[14px] focus:[outline:none]"
                          }
                        >
                          {t(activeNode.question)}
                        </h2>
                        <details
                          className={
                            "example bg-[var(--theme-surface,#263a2c)] [border-left:2px_solid_var(--theme-border,#adc57f)] py-3.5 px-4.5 my-6 mx-0 [&_small]:text-[11px] [&_small]:text-muted lg:compact:py-2 lg:compact:px-3 lg:compact:my-3"
                          }
                          open
                        >
                          <summary
                            className={
                              "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 text-[13px] cursor-pointer"
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
                        <p className={"mb-[1em] mt-0"}>
                          {current?.content
                            ? t(current.content)
                            : t(
                                "No answer yet. In your project, this is a place for an answer, an uncertainty, or what you learned.",
                              )}
                        </p>
                        <Link
                          href={href(activeStage.id)}
                          className={
                            "button secondary lg:compact:min-h-8.5 lg:compact:py-2 lg:compact:px-3 lg:compact:text-[12px] lg:compact:rounded-[7px] rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[var(--theme-selected,#344c39)] text-lime border border-[var(--theme-border,#658451)] hover:[background:var(--theme-selected,#456248)]"
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
                              'tree-row grid grid-cols-[repeat(auto-fit,_minmax(145px,_1fr))] gap-2.5 relative [&:not(:first-child)::before]:[content:"↓"] [&:not(:first-child)::before]:absolute [&:not(:first-child)::before]:top-[-19px] [&:not(:first-child)::before]:left-[49%] [&:not(:first-child)::before]:[color:var(--theme-text,#9cad82)] [&:not(:first-child)::before]:text-[12px] [&:not(:first-child)::before]:leading-[16px] lg:compact:[&:not(:first-child)::before]:top-[-16px] lg:compact:[&:not(:first-child)::before]:leading-[14px] min-[2000px]:compact:grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] max-[700px]:grid-cols-[minmax(0,_1fr)]'
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
                                    "grid flex-col gap-[3px_10px] border border-line rounded-[7px] py-2.25 px-3 bg-[var(--theme-surface,#1c3028)] wrap-anywhere grid-cols-[minmax(0,_1fr)_auto] [align-content:center] items-center min-h-11 [&.answered]:[border-color:var(--theme-border,#738d50)] [&.blocked]:[border-color:var(--theme-border,#b59769)] hover:[background:var(--theme-surface,#284332)] max-[700px]:p-3.5 lg:compact:py-1.75 lg:compact:px-2.5 lg:compact:gap-[2px_10px] lg:compact:rounded-[8px]",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  <span
                                    className={
                                      "node-state [text-transform:capitalize] text-lime col-start-2 row-start-1 text-[11px] text-right"
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
                                    className={"text-[13px] leading-[1.4] col-start-1 row-start-1"}
                                  >
                                    {t(node.label)}
                                  </strong>
                                  <small
                                    className={
                                      "node-type text-muted col-start-2 row-start-2 text-[11px] text-right"
                                    }
                                  >
                                    {t(node.kind)}
                                  </small>
                                  {node.after.length > 0 && (
                                    <small
                                      className={
                                        "node-after max-[700px]:hidden text-muted text-[11px] border-t-line col-start-1 row-start-2 border-0 p-0 leading-[1.4]"
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
                            "review-note text-[13px] bg-[var(--theme-warning,#3c3e28)] p-3.75 rounded-[8px] lg:compact:p-2.5 lg:compact:my-2.5 lg:compact:mx-0"
                          }
                        >
                          <strong>
                            {review.reviewed
                              ? t("✓ Stage reviewed")
                              : t("↶ Revisit this review after earlier changes")}
                          </strong>
                          <p
                            className={
                              "preserve-lines whitespace-pre-wrap wrap-anywhere mt-3 mx-0 mb-0"
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
            "project-discussion-column min-w-0 max-w-full overflow-hidden col-span-1 col-start-1 row-start-2 min-[701px]:col-span-7 min-[1001px]:col-span-8 [&_>_.discussion]:mt-0 min-[1280px]:col-span-2 min-[1280px]:col-start-1 min-[1280px]:row-start-1 min-[1280px]:sticky min-[1280px]:top-5 min-[1280px]:max-h-[calc(100dvh_-_40px)] min-[1280px]:[&_>_.discussion]:flex min-[1280px]:[&_>_.discussion]:flex-col min-[1280px]:[&_>_.discussion]:max-h-[calc(100dvh_-_40px)] min-[1280px]:[&_>_.discussion]:overflow-y-auto"
          }
        >
          {discussion}
        </div>
      )}
      <div
        className={[
          "project-sidebar grid gap-2 min-w-0 max-w-full overflow-hidden content-start [&_.project-settings]:mb-0 col-span-1 col-start-1 row-start-3 min-[701px]:col-span-5 min-[701px]:col-start-8 min-[701px]:row-span-2 min-[701px]:row-start-1 min-[1001px]:col-span-4 min-[1001px]:col-start-9",
          discussion &&
            "min-[1280px]:col-span-2 min-[1280px]:col-start-11 min-[1280px]:row-span-1 min-[1280px]:row-start-1",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <details
          open
          className="panel journey-progress-panel p-2.5 bg-panel border border-line rounded-[10px] min-w-0 max-w-full overflow-hidden [&_.journey-progress-controls]:ml-auto"
          aria-label={t("Questions answered, not proof of success")}
        >
          <summary className="cursor-pointer select-none [[open]>&]:mb-2">
            <h2 className="inline-flex items-center m-0 text-[14px] leading-[1.3]">
              {t("Progress")}{" "}
              <span className="count text-[11px] px-1.5 py-0.5 ml-1.25">
                {answered}/{questions.length}
              </span>
            </h2>
          </summary>
          <div
            className={
              "journey-summary flex items-center justify-between gap-3 [&_.eyebrow]:mb-2.5 lg:compact:mb-1.5 lg:compact:[&_.eyebrow]:m-0 flex-wrap mb-3.5 min-w-0"
            }
          >
            <div
              className={
                "min-w-0 flex-1 break-words first:grid first:gap-1 lg:compact:first:flex lg:compact:first:items-center lg:compact:first:flex-wrap lg:compact:first:gap-[4px_8px]"
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
            className={
              "progress-track h-1 bg-[var(--theme-surface,#2f4337)] rounded-[4px] overflow-hidden"
            }
            role="progressbar"
            aria-label={t("Questions answered, not proof of success")}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={answered}
          >
            <span
              style={{ width: `${(answered / questions.length) * 100}%` }}
              className={"h-full block bg-lime"}
            />
          </div>
        </details>
        {sidebar}
      </div>
    </div>
  );
}
