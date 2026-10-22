import Link from "next/link";
import { notFound } from "next/navigation";
import type { Guidance, Revision } from "@/lib/guidance";
import type { FlowStage } from "@/lib/flows";
import { AnswerEditor, StageReviewForm } from "./guidance";
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
      <div className="journey-summary">
        <div>
          <span className="eyebrow">{flow.name.toUpperCase()} · YOUR PATH</span>
          <p>
            <strong>{answered}</strong> of {questions.length} questions answered
          </p>
          <small>
            {skipped} skipped · {blocked} blocked ·{" "}
            {guidance.projectState.replaceAll("_", " ")}
          </small>
        </div>
        <div
          className="progress-ring"
          style={
            {
              "--progress": `${questions.length ? (answered / questions.length) * 100 : 0}%`,
            } as React.CSSProperties
          }
        >
          <span aria-hidden="true">✳</span>
        </div>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Questions answered, not proof of success"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answered}
      >
        <span style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>
      {!activeStage ? (
        <>
          <p className="journey-hint">
            A path, not a test. Open any stage and follow your curiosity.
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
                      <span className="stage-label">{stage.name}</span>
                      <h2>{stage.question}</h2>
                      <small>
                        {reviewed
                          ? "✓ Reviewed"
                          : count
                            ? "In progress"
                            : "Not started"}{" "}
                        · {count}/{questions.length} questions answered
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
              A small next step: {next.node.label} ↗
            </Link>
          )}
        </>
      ) : (
        <>
          <nav className="journey-breadcrumb" aria-label="Project path">
            <Link href={base}>All stages</Link>
            <span>/</span>
            <Link
              href={href(activeStage.id)}
              aria-current={activeNode ? undefined : "page"}
            >
              {activeStage.name}
            </Link>
            {activeNode && (
              <>
                <span>/</span>
                <span aria-current="page">{activeNode.label}</span>
              </>
            )}
          </nav>
          {activeNode ? (
            preview ? (
              <section className="panel answer-panel">
                <span className="eyebrow">READ-ONLY EXAMPLE</span>
                <h2>{activeNode.question}</h2>
                <details className="example" open>
                  <summary>A little inspiration</summary>
                  <p>{activeNode.example}</p>
                </details>
                <p>
                  {current?.content ||
                    "No answer yet. In your project, this is a place for an answer, an uncertainty, or what you learned."}
                </p>
                <Link href={href(activeStage.id)} className="button secondary">
                  Back to this stage
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
              <h2>{activeStage.question}</h2>
              <p className="muted">
                Open a step to see its question and example. Branches can be
                explored in any order.
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
                            {answer?.status ?? "unanswered"}
                            {answer?.needs_review ? " · revisit" : ""}
                          </span>
                          <strong>{node.label}</strong>
                          <small>{node.kind}</small>
                          {node.after.length > 0 && (
                            <small className="node-after">
                              After:{" "}
                              {node.after
                                .map(
                                  (id) =>
                                    activeStage.nodes.find((n) => n.id === id)
                                      ?.label,
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
                  Need help or another round?{" "}
                  <Link href={href("building", "next-task")}>
                    Return to the next task ↶
                  </Link>
                </p>
              )}
              {activeStage.id === "experiment" && (
                <p className="loop-links">
                  Trying another direction?{" "}
                  <Link href={href("experiment", "rough-version")}>
                    Try another little piece ↶
                  </Link>
                </p>
              )}
              {activeStage.id === "create" && (
                <p className="loop-links">
                  Not finished enough?{" "}
                  <Link href={href("create", "next-piece")}>
                    Make the next piece ↶
                  </Link>
                </p>
              )}
              {activeStage.id === "validation" && (
                <p className="loop-links">
                  Revising the idea?{" "}
                  <Link href={href("exploration")}>Revisit Exploration ↶</Link>
                </p>
              )}
              {review && (
                <div className="review-note">
                  <strong>
                    {review.reviewed
                      ? "✓ Stage reviewed"
                      : "↶ Revisit this review after earlier changes"}
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
