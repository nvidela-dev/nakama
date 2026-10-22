"use client";
import { WaveMark } from "@/components/wave-mark";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useT } from "@/components/language";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Guidance, Revision } from "@/lib/guidance";
import type { FlowStage } from "@/lib/flows";
import { AnswerEditor, StageReviewForm } from "./guidance";
const JourneyMiniview = dynamic(() => import("./journey-miniview"), { ssr: false });
const symbols: Record<string, string> = {
  unanswered: "○",
  draft: "◐",
  answered: "✓",
  skipped: "↷",
  blocked: "!",
};
function levels(stage: FlowStage) {
  const depth = new Map<string, number>();
  for (const node of stage.nodes)
    depth.set(
      node.id,
      node.after.length
        ? Math.max(...node.after.map((id) => depth.get(id) ?? 0)) + 1
        : 0,
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
}: {
  projectId: string;
  guidance: Guidance;
  stageId?: string;
  nodeId?: string;
  history?: Revision[];
  names?: Record<string, string>;
  preview?: boolean;
}) {
  const t = useT();
  const [showMap, setShowMap] = useState(false);
  const { flow, answers, reviews } = guidance;
  const base = preview ? "/preview" : `/projects/${projectId}`;
  const href = (stage?: string, node?: string) =>
    `${base}${stage ? `?stage=${stage}` : ""}${node ? `&node=${node}` : ""}`;
  const questions = flow.stages
    .flatMap((s) => s.nodes)
    .filter((n) => n.kind === "question");
  const answered = questions.filter((n) =>
    answers.some((a) => a.node_id === n.id && a.status === "answered"),
  ).length;
  const skipped = answers.filter((a) => a.status === "skipped").length;
  const blocked = answers.filter((a) => a.status === "blocked").length;
  const activeStage = stageId
    ? flow.stages.find((s) => s.id === stageId)
    : undefined;
  if (stageId && !activeStage) notFound();
  const activeNode = nodeId
    ? activeStage?.nodes.find((n) => n.id === nodeId)
    : undefined;
  if (nodeId && !activeNode) notFound();
  const current = answers.find((a) => a.node_id === nodeId);
  const next = flow.stages
    .flatMap((stage) => stage.nodes.map((node) => ({ stage, node })))
    .find(
      ({ node }) =>
        node.kind === "question" &&
        !answers.some(
          (a) =>
            a.node_id === node.id && ["answered", "skipped"].includes(a.status),
        ),
    );
  const review = reviews.find((r) => r.stage_id === stageId);
  return (
    <section className="journey">
      {activeStage && (
        <nav className="desktop-stage-nav" aria-label={t("All stages")}>
          {flow.stages.map((stage, index) => (
            <Link
              key={stage.id}
              href={href(stage.id)}
              aria-current={stage.id === activeStage.id ? "step" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span> {t(stage.name)}
            </Link>
          ))}
        </nav>
      )}
      <div className="journey-summary">
        <div>
          <span className="eyebrow">
            {t(flow.name).toLocaleUpperCase()} {t("· YOUR PATH")}
          </span>
          <p>
            <strong>{answered}</strong> {t("of")} {questions.length}{" "}
            {t("questions answered")}{" "}
          </p>
          <small>
            {skipped} {t("skipped ·")} {blocked} {t("blocked ·")}{" "}
            {t(guidance.projectState.replaceAll("_", " "))}
          </small>
        </div>
        <div className="journey-progress-controls">
          <button type="button" className="button secondary miniview-icon" aria-label={showMap ? t("Hide 3D mini-view") : t("Show 3D mini-view")} title={showMap ? t("Hide 3D mini-view") : t("Show 3D mini-view")} aria-expanded={showMap} aria-controls="project-stage-map" onClick={() => setShowMap(!showMap)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z M3 7l9 5 9-5 M12 12v10 M7.5 4.5l9 5v5" />
            </svg>
          </button>
        <div
          className="progress-ring"
          style={
            {
              "--progress": `${questions.length ? (answered / questions.length) * 100 : 0}%`,
            } as React.CSSProperties
          }
        >
          <span aria-hidden="true"><WaveMark /></span>
        </div>
        </div>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={t("Questions answered, not proof of success")}
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answered}
      >
        <span style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>
      <div id="project-stage-map">
        {showMap && <JourneyMiniview guidance={guidance} base={base} stageId={stageId} nodeId={nodeId} />}
      </div>
      {!activeStage ? (
        <>
          <p className="journey-hint">
            {t("Select a stage to view its questions.")}{" "}
          </p>
          <ol className="stage-list">
            {flow.stages.map((stage, i) => {
              const questions = stage.nodes.filter(
                (n) => n.kind === "question",
              );
              const count = questions.filter((n) =>
                answers.some(
                  (a) => a.node_id === n.id && a.status === "answered",
                ),
              ).length;
              const reviewed = reviews.some(
                (r) => r.stage_id === stage.id && r.reviewed,
              );
              return (
                <li key={stage.id}>
                  <Link href={href(stage.id)} className="stage-card">
                    <span className="stage-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="stage-label">{t(stage.name)}</span>
                      <h2>{t(stage.question)}</h2>
                      <small>
                        {reviewed
                          ? t("✓ Reviewed")
                          : count
                            ? t("In progress")
                            : t("Not started")}{" "}
                        · {count}/{questions.length}{" "}
                        {t("questions answered")}{" "}
                      </small>
                    </div>
                    <span className="stage-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {next && (
            <Link
              className="button secondary"
              href={href(next.stage.id, next.node.id)}
            >
              {t("Next unanswered question:")} {t(next.node.label)} ↗
            </Link>
          )}
        </>
      ) : (
        <>
          <nav className="journey-breadcrumb" aria-label={t("Project path")}>
            <Link href={base}>{t("All stages")}</Link>
            <span>/</span>
            <Link
              href={href(activeStage.id)}
              aria-current={activeNode ? undefined : "page"}
            >
              {t(activeStage.name)}
            </Link>
            {activeNode && (
              <>
                <span>/</span>
                <span aria-current="page">{t(activeNode.label)}</span>
              </>
            )}
          </nav>
          {activeNode ? (
            preview ? (
              <section className="panel answer-panel">
                <span className="eyebrow">{t("READ-ONLY EXAMPLE")}</span>
                <h2>{t(activeNode.question)}</h2>
                <details className="example" open>
                  <summary>{t("Example")}</summary>
                  <p>{t(activeNode.example)}</p>
                </details>
                <p>
                  {current?.content
                    ? t(current.content)
                    : t(
                        "No answer yet. In your project, this is a place for an answer, an uncertainty, or what you learned.",
                      )}
                </p>
                <Link href={href(activeStage.id)} className="button secondary">
                  {t("Back to this stage")}{" "}
                </Link>
              </section>
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
            <section className="stage-expanded">
              <h2>{t(activeStage.question)}</h2>
              <p className="muted">
                {t(
                  "Open a step to see its question and example. Branches can be explored in any order.",
                )}{" "}
              </p>
              <div className="node-tree">
                {levels(activeStage).map((row, i) => (
                  <div key={i} className="tree-row">
                    {row.map((node) => {
                      const answer = answers.find((a) => a.node_id === node.id);
                      return (
                        <Link
                          key={node.id}
                          href={href(activeStage.id, node.id)}
                          className={`question-node ${answer?.status ?? "unanswered"}`}
                        >
                          <span className="node-state">
                            {symbols[answer?.status ?? "unanswered"]}{" "}
                            {t(answer?.status ?? "unanswered")}
                            {answer?.needs_review ? t(" · revisit") : ""}
                          </span>
                          <strong>{t(node.label)}</strong>
                          <small>{t(node.kind)}</small>
                          {node.after.length > 0 && (
                            <small className="node-after">
                              {t("After:")}{" "}
                              {node.after
                                .map((id) =>
                                  t(
                                    activeStage.nodes.find((n) => n.id === id)
                                      ?.label ?? "",
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
                <p className="loop-links">
                  {t("Need help or another round?")}{" "}
                  <Link href={href("building", "next-task")}>
                    {t("Return to the next task ↶")}{" "}
                  </Link>
                </p>
              )}
              {activeStage.id === "experiment" && (
                <p className="loop-links">
                  {t("Trying another direction?")}{" "}
                  <Link href={href("experiment", "rough-version")}>
                    {t("Test another prototype ↶")}{" "}
                  </Link>
                </p>
              )}
              {activeStage.id === "create" && (
                <p className="loop-links">
                  {t("Not finished enough?")}{" "}
                  <Link href={href("create", "next-piece")}>
                    {t("Make the next piece ↶")}{" "}
                  </Link>
                </p>
              )}
              {activeStage.id === "validation" && (
                <p className="loop-links">
                  {t("Revising the idea?")}{" "}
                  <Link href={href("exploration")}>
                    {t("Revisit Exploration ↶")}
                  </Link>
                </p>
              )}
              {review && (
                <div className="review-note">
                  <strong>
                    {review.reviewed
                      ? t("✓ Stage reviewed")
                      : t("↶ Revisit this review after earlier changes")}
                  </strong>
                  <p className="preserve-lines">{review.rationale}</p>
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
    </section>
  );
}
