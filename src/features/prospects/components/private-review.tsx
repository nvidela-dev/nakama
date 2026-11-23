"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Panel } from "@/shared/ui/panel";
import { useT } from "@/shared/i18n/provider";
import { useHydrated } from "@/shared/lib/use-hydrated";
import type { ActionState } from "@/shared/contracts/action-state";
import type { saveProspectReview } from "../review-actions";
import {
  assessmentQuestions,
  assessmentRatings,
  assessmentScore,
  decisionLabels,
  callLabels,
  type Assessment,
  type CallReview,
  type PrivateProspectReview,
  type Rating,
} from "../review-model";

const input = (form: FormData, name: string) => String(form.get(name) ?? "").trim() || undefined;
const ratings = [1, 2, 3] as const;
const ratingOf = (value: unknown) => ratings.find((r) => String(r) === value);
const decisions = ["ready", "research", "park"] as const;
const outcomes = ["well", "poorly", "no_answer", "voicemail"] as const;
const nextOptions = {
  follow_up: "Follow up",
  close: "Close without follow-up",
  undecided: "Undecided",
} as const;
const nextKeys = ["follow_up", "close", "undecided"] as const;

function RatingField({
  name,
  title,
  hint,
  initial,
  change,
}: {
  name: string;
  title: string;
  hint: string;
  initial: Rating | undefined;
  change?: (rating: Rating | undefined) => void;
}) {
  const t = useT();
  return (
    <label className="grid gap-1">
      <span className="font-medium">{t(title)}</span>
      <span className="text-xs text-muted">{t(hint)}</span>
      <Select
        name={name}
        defaultValue={initial ?? ""}
        onChange={(e) => change?.(ratingOf(e.target.value))}
      >
        <option value="">{t("Unrated")}</option>
        {ratings.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
    </label>
  );
}

function AssessmentForm({
  prospectId,
  assessment,
  canAdvance,
  saveReviewAction,
}: {
  prospectId: string;
  assessment: PrivateProspectReview["assessment"];
  canAdvance: boolean;
  saveReviewAction: typeof saveProspectReview;
}) {
  const t = useT();
  const hydrated = useHydrated();
  const [revision, setRevision] = useState(assessment?.revision ?? 0);
  const [selectedRatings, setSelectedRatings] = useState<Assessment["ratings"]>(
    assessment?.value.ratings ?? {},
  );
  const [decision, setDecision] = useState(assessment?.value.decision);
  const [pending, start] = useTransition();
  const [feedback, result] = useState<ActionState>({});
  const score = assessmentScore(selectedRatings);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const advance =
      e.nativeEvent instanceof SubmitEvent &&
      e.nativeEvent.submitter?.getAttribute("data-review-intent") === "advance";
    const value: Assessment = {
      answers: Object.fromEntries(
        assessmentQuestions.flatMap(([key]) => {
          const answer = input(form, key);
          return answer ? [[key, answer]] : [];
        }),
      ),
      ratings: selectedRatings,
      decision,
    };
    start(async () => {
      try {
        const saved = await saveReviewAction({
          type: "assessment",
          prospectId,
          revision,
          value,
          advance,
        });
        if (saved.revision !== undefined) setRevision(saved.revision);
        result(saved);
      } catch {
        result({ error: "Unable to save. Please try again." });
      }
    });
  }
  return (
    <form method="post" onSubmit={submit} className="grid gap-3">
      <fieldset disabled={!hydrated || pending} className="grid gap-3 min-w-0">
        <legend className="text-lg font-semibold">{t("Private assessment")}</legend>
        <p className="text-sm text-muted">
          {t(
            "Record what you can observe and what is still a hypothesis. Unknown ratings stay blank.",
          )}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {assessmentQuestions.map(([key, title]) => (
            <label key={key} className="grid gap-1">
              <span className="font-medium">{t(title)}</span>
              <Textarea
                name={key}
                maxLength={3000}
                rows={2}
                defaultValue={assessment?.value.answers[key]}
              />
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {assessmentRatings.map(([key, title, hint]) => (
            <RatingField
              key={key}
              name={key + "_rating"}
              title={title}
              hint={hint}
              initial={assessment?.value.ratings[key]}
              change={(rating) => setSelectedRatings((prior) => ({ ...prior, [key]: rating }))}
            />
          ))}
        </div>
        <p aria-live="polite" className="text-sm text-muted">
          {t("{done} of {total} ratings entered", { done: score.done, total: score.total })}
          {score.average !== null &&
            " · " + t("Average: {average} of 3", { average: score.average.toFixed(2) })}
        </p>
        <label className="grid gap-1">
          {t("Assessment decision")}
          <Select
            name="decision"
            value={decision ?? ""}
            onChange={(e) => setDecision(decisions.find((d) => d === e.target.value))}
          >
            <option value="">{t("No decision yet")}</option>
            {decisions.map((key) => (
              <option key={key} value={key}>
                {t(decisionLabels[key])}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" pending={pending}>
            {t("Save assessment")}
          </Button>
          {canAdvance && (
            <Button
              type="submit"
              data-review-intent="advance"
              disabled={decision !== "ready"}
              pending={pending}
            >
              {t("Mark Ready to call")}
            </Button>
          )}
        </div>
      </fieldset>
      <Feedback state={feedback} />
    </form>
  );
}

const callFields = {
  clicked: "What clicked?",
  agreed: "What did they request or agree to?",
  stalled: "Where did the call stall?",
  reason: "Why did it stall? Write unknown if unsure.",
  change: "What would you change next time?",
  note: "Call notes",
} as const;
const callRatings = {
  interest: ["Interest", "1: little interest; 3: clear interest."],
  commitment: ["Commitment", "1: no agreement; 3: a concrete commitment."],
  objection: ["Objection clarity", "1: unclear objection; 3: a specific objection."],
  recoverability: ["Recoverability", "1: unlikely to recover; 3: a clear path to try again."],
} as const;

function CallForm({
  prospectId,
  draft,
  saveReviewAction,
}: {
  prospectId: string;
  draft: PrivateProspectReview["draft"];
  saveReviewAction: typeof saveProspectReview;
}) {
  const t = useT();
  const hydrated = useHydrated();
  const [saved, setSaved] = useState({
    revision: draft?.revision ?? 0,
    draftId: draft?.id ?? null,
  });
  const [draftValue, setDraftValue] = useState(draft?.value);
  const [outcome, setOutcome] = useState(draft?.value.outcome);
  const [actionCount, setActionCount] = useState(Math.max(1, draft?.value.actions.length ?? 0));
  const [formVersion, setFormVersion] = useState(0);
  const [pending, start] = useTransition();
  const [feedback, result] = useState<ActionState>({});

  function field(key: keyof typeof callFields) {
    return (
      <label className="grid gap-1" key={key}>
        {t(callFields[key])}
        <Textarea name={key} defaultValue={draftValue?.[key]} maxLength={3000} rows={2} />
      </label>
    );
  }
  function rating(key: keyof typeof callRatings) {
    const [title, hint] = callRatings[key];
    return (
      <RatingField key={key} name={key} title={title} hint={hint} initial={draftValue?.[key]} />
    );
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const record =
      e.nativeEvent instanceof SubmitEvent &&
      e.nativeEvent.submitter?.getAttribute("data-review-intent") === "record";
    const actions = Array.from({ length: actionCount }, (_, i) => ({
      task: input(form, "action_" + i) ?? "",
      due: input(form, "due_" + i) ?? "",
    }));
    if (actions.some((a) => !a.task && a.due)) {
      result({ error: "Enter an action for each selected date." });
      return;
    }
    const value: CallReview = {
      outcome,
      happenedOn: input(form, "happenedOn"),
      note: input(form, "note"),
      actions: actions.filter((a) => a.task),
      ...(outcome === "well"
        ? {
            clicked: input(form, "clicked"),
            agreed: input(form, "agreed"),
            interest: ratingOf(form.get("interest")),
            commitment: ratingOf(form.get("commitment")),
          }
        : {}),
      ...(outcome === "poorly"
        ? {
            stalled: input(form, "stalled"),
            reason: input(form, "reason"),
            change: input(form, "change"),
            objection: ratingOf(form.get("objection")),
            recoverability: ratingOf(form.get("recoverability")),
            next: nextKeys.find((key) => key === input(form, "next")),
          }
        : {}),
    };
    start(async () => {
      try {
        const response = await saveReviewAction({
          type: "call",
          prospectId,
          ...saved,
          value,
          record,
        });
        if (response.revision !== undefined) {
          setSaved({ revision: response.revision, draftId: response.draftId ?? null });
          if (record) {
            setDraftValue(undefined);
            setOutcome(undefined);
            setActionCount(1);
            setFormVersion((v) => v + 1);
          } else setDraftValue(value);
        }
        result(response);
      } catch {
        result({ error: "Unable to save. Please try again." });
      }
    });
  }
  return (
    <form method="post" onSubmit={submit} className="grid gap-3">
      <fieldset disabled={!hydrated || pending} key={formVersion} className="grid gap-3 min-w-0">
        <legend className="text-lg font-semibold">{t("Private call debrief")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            {t("Call result")}
            <Select
              name="outcome"
              value={outcome ?? ""}
              onChange={(e) => setOutcome(outcomes.find((o) => o === e.target.value))}
            >
              <option value="">{t("Select a call result")}</option>
              {outcomes.map((key) => (
                <option key={key} value={key}>
                  {t(callLabels[key])}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1">
            {t("Call date")}
            <Input name="happenedOn" type="date" defaultValue={draftValue?.happenedOn} />
          </label>
        </div>
        {outcome === "well" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {field("clicked")}
            {field("agreed")}
            {rating("interest")}
            {rating("commitment")}
          </div>
        )}
        {outcome === "poorly" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {field("stalled")}
            {field("reason")}
            {field("change")}
            {rating("objection")}
            {rating("recoverability")}
            <label className="grid gap-1">
              {t("Follow-up or closure")}
              <Select name="next" defaultValue={draftValue?.next ?? ""}>
                <option value="">{t("No decision yet")}</option>
                {nextKeys.map((key) => (
                  <option key={key} value={key}>
                    {t(nextOptions[key])}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        )}
        {(outcome === "no_answer" || outcome === "voicemail") && (
          <p className="text-sm text-muted">{t("This logs an attempt without ratings.")}</p>
        )}
        {field("note")}
        <fieldset className="grid gap-2 min-w-0">
          <legend className="font-medium">{t("Dated next actions")}</legend>
          {Array.from({ length: actionCount }, (_, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="grid gap-1">
                {t("Next action")}
                <Input
                  name={"action_" + i}
                  maxLength={300}
                  defaultValue={draftValue?.actions[i]?.task}
                />
              </label>
              <label className="grid gap-1">
                {t("Due date")}
                <Input name={"due_" + i} type="date" defaultValue={draftValue?.actions[i]?.due} />
              </label>
            </div>
          ))}
          {actionCount < 5 && (
            <Button
              type="button"
              variant="secondary"
              className="justify-self-start"
              onClick={() => setActionCount((n) => n + 1)}
            >
              {t("Add another action")}
            </Button>
          )}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" pending={pending}>
            {t("Save draft")}
          </Button>
          <Button type="submit" data-review-intent="record" pending={pending}>
            {t("Record call")}
          </Button>
        </div>
      </fieldset>
      <Feedback state={feedback} />
    </form>
  );
}

export function ProspectPrivateReview({
  prospectId,
  review,
  canAdvance,
  olderHref,
  saveReviewAction,
}: {
  prospectId: string;
  review: PrivateProspectReview;
  canAdvance: boolean;
  olderHref: string | null;
  saveReviewAction: typeof saveProspectReview;
}) {
  const t = useT();
  return (
    <div className="grid gap-4" id="private-prospect-review">
      <Panel>
        <AssessmentForm
          prospectId={prospectId}
          assessment={review.assessment}
          canAdvance={canAdvance}
          saveReviewAction={saveReviewAction}
        />
      </Panel>
      <Panel>
        <CallForm
          prospectId={prospectId}
          draft={review.draft}
          saveReviewAction={saveReviewAction}
        />
      </Panel>
      <Panel>
        <h2 className="text-lg font-semibold">{t("Private call history")}</h2>
        {!review.history.length && (
          <p className="text-sm text-muted">{t("No private calls recorded.")}</p>
        )}
        <ul className="divide-y divide-line">
          {review.history.map(({ id, recordedAt, value }) => (
            <li key={id} className="py-2">
              <details>
                <summary className="cursor-pointer font-semibold">
                  {value.outcome && t(callLabels[value.outcome])} ·{" "}
                  <time dateTime={value.happenedOn ?? recordedAt}>
                    {value.happenedOn ?? recordedAt.slice(0, 10)}
                  </time>
                </summary>
                <dl className="my-2 grid gap-2">
                  {(["clicked", "agreed", "stalled", "reason", "change", "note"] as const).map(
                    (key) =>
                      value[key] && (
                        <div key={key}>
                          <dt className="font-medium">{t(callFields[key])}</dt>
                          <dd className="whitespace-pre-wrap wrap-anywhere">{value[key]}</dd>
                        </div>
                      ),
                  )}
                  {(["interest", "commitment", "objection", "recoverability"] as const).map(
                    (key) =>
                      value[key] && (
                        <div key={key}>
                          <dt className="font-medium">{t(callRatings[key][0])}</dt>
                          <dd>{value[key]} / 3</dd>
                        </div>
                      ),
                  )}
                  {value.next && (
                    <div>
                      <dt className="font-medium">{t("Follow-up or closure")}</dt>
                      <dd>{t(nextOptions[value.next])}</dd>
                    </div>
                  )}
                </dl>
                <ul>
                  {value.actions.map((a, i) => (
                    <li key={i}>
                      <time dateTime={a.due}>{a.due}</time> · {a.task}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
        {olderHref && (
          <a className="underline" href={olderHref}>
            {t("Older call reviews")}
          </a>
        )}
      </Panel>
    </div>
  );
}
