import type { FlowStage } from "./flows";
import type { Guidance } from "./types";

type Coverage = {
  answered: number;
  total: number;
  started: boolean;
  reviewed: boolean;
  revisit: boolean;
};
export function stageLabel({ answered, total, started, reviewed, revisit }: Coverage) {
  if (reviewed && !revisit) return "✓ Reviewed";
  if (total > 0 && answered === total) return "All questions answered";
  return started ? "In progress" : "Not started";
}
export function stageCoverage(
  stage: FlowStage,
  { answers, reviews }: Pick<Guidance, "answers" | "reviews">,
): Coverage {
  const saved = answers.filter((answer) => answer.stage_id === stage.id);
  const questions = stage.nodes.filter((node) => node.kind === "question");
  const review = reviews.find((record) => record.stage_id === stage.id);
  return {
    answered: questions.filter((node) =>
      saved.some((answer) => answer.node_id === node.id && answer.status === "answered"),
    ).length,
    total: questions.length,
    started: saved.some((answer) => answer.status !== "unanswered") || !!review,
    reviewed: !!review?.reviewed,
    revisit: saved.some((answer) => answer.needs_review),
  };
}
