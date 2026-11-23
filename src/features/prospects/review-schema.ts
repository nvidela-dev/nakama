import { z } from "zod";

const answer = z.string().trim().max(3000).optional();
const rating = z.union([z.literal(1), z.literal(2), z.literal(3)]).optional();

export const assessmentSchema = z.strictObject({
  answers: z.strictObject({
    business: answer,
    problem: answer,
    impact: answer,
    offer: answer,
    unknown: answer,
    budget: answer,
  }),
  ratings: z.strictObject({ evidence: rating, impact: rating, fit: rating, pay: rating }),
  decision: z.enum(["ready", "research", "park"]).optional(),
});
export const callReviewSchema = z
  .strictObject({
    outcome: z.enum(["well", "poorly", "no_answer", "voicemail"]).optional(),
    happenedOn: z.iso.date().optional(),
    note: answer,
    clicked: answer,
    agreed: answer,
    stalled: answer,
    reason: answer,
    change: answer,
    next: z.enum(["follow_up", "close", "undecided"]).optional(),
    interest: rating,
    commitment: rating,
    objection: rating,
    recoverability: rating,
    actions: z
      .array(
        z.strictObject({
          task: z.string().trim().min(1).max(300),
          due: z.union([z.iso.date(), z.literal("")]),
        }),
      )
      .max(5),
  })
  .refine(
    (v) =>
      (v.outcome === "well" ||
        [v.clicked, v.agreed, v.interest, v.commitment].every((f) => f === undefined)) &&
      (v.outcome === "poorly" ||
        [v.stalled, v.reason, v.change, v.next, v.objection, v.recoverability].every(
          (f) => f === undefined,
        )),
  );
export const reviewCursor = z.string().regex(/^[1-9][0-9]{0,17}$/);
const base = { prospectId: z.uuid(), revision: z.number().int().nonnegative().max(2147483646) };
export const reviewCommand = z.discriminatedUnion("type", [
  z.strictObject({
    ...base,
    type: z.literal("assessment"),
    value: assessmentSchema,
    advance: z.boolean(),
  }),
  z.strictObject({
    ...base,
    type: z.literal("call"),
    value: callReviewSchema,
    draftId: reviewCursor.nullable(),
    record: z.boolean(),
  }),
]);
export type ReviewCommand = z.input<typeof reviewCommand>;
