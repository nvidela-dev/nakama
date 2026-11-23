import type { z } from "zod";
import type { assessmentSchema, callReviewSchema } from "./review-schema";

export const assessmentQuestions = [
  ["business", "What does the business sell, and what does its website do today?"],
  ["problem", "What observable problem did you find?"],
  ["impact", "How might this affect its customers?"],
  ["offer", "How could a one-page offer help?"],
  ["unknown", "What still needs confirmation?"],
  ["budget", "What is your budget hypothesis?"],
] as const;

export const assessmentRatings = [
  [
    "evidence",
    "Strength of evidence",
    "1: weak indication; 3: strong, directly observable evidence.",
  ],
  ["impact", "Customer impact", "1: minor inconvenience; 3: clear harm to the customer journey."],
  ["fit", "One-page offer fit", "1: needs a different solution; 3: clearly fits one page."],
  [
    "pay",
    "Likelihood to pay",
    "1: weak buying signal; 3: strong buying signal. This is not a confirmed budget.",
  ],
] as const;

export const decisionLabels = {
  ready: "Ready to call",
  research: "Research more",
  park: "Park",
} as const;
export const callLabels = {
  well: "Went well",
  poorly: "Went poorly",
  no_answer: "No answer",
  voicemail: "Voicemail",
} as const;

export type Rating = 1 | 2 | 3;
export type Assessment = z.infer<typeof assessmentSchema>;
export type CallReview = z.infer<typeof callReviewSchema>;

export type Versioned<T> = { id: string; revision: number; value: T };
export type RecordedCall = { id: string; recordedAt: string; value: CallReview };
export type PrivateProspectReview = {
  assessment: { revision: number; value: Assessment } | null;
  draft: Versioned<CallReview> | null;
  history: RecordedCall[];
  previous: string | null;
};

export function assessmentScore(ratings: Assessment["ratings"]) {
  const values = assessmentRatings.flatMap(([key]) => ratings[key] ?? []);
  return {
    done: values.length,
    total: assessmentRatings.length,
    average:
      values.length === assessmentRatings.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
  };
}
