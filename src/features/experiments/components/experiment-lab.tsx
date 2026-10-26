"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { useT } from "@/shared/i18n/provider";
import type { saveExperiment, reloadExperiments, exportExperimentBrief } from "../actions";
import type { Experiment, Plan, LabOperation } from "../model";
import type { ExperimentPrompts } from "../flow-prompts";
const fieldClass = "w-full rounded-md border border-line bg-panel p-2 text-[14px]";
const empty: Plan = {
  claim: "",
  method: "",
  criteria: "",
  scope: "",
  metric: "",
  baseline: "",
  owner: "",
  limits: "",
  milestone: "",
  nodeId: "",
};
type Props = {
  projectId: string;
  initial: Experiment[];
  questions: { id: string; label: string; stageId: string }[];
  initialNode?: string;
  initialClaim?: string;
  startNew?: boolean;
  prompts?: ExperimentPrompts | undefined;
  names?: Record<string, string | null>;
  save: typeof saveExperiment;
  reload: typeof reloadExperiments;
  exportBrief: typeof exportExperimentBrief;
};
function Field({
  name,
  label,
  value = "",
  required = false,
  numeric = false,
  hint,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
  numeric?: boolean;
  hint?: string | undefined;
}) {
  return (
    <label className="grid gap-1 text-[14px]">
      <span>{label}</span>
      {hint && <small className="text-muted text-[12px]">{hint}</small>}
      {numeric ? (
        <Input
          className={fieldClass}
          name={name}
          type="number"
          min="0"
          step="1"
          defaultValue={value}
        />
      ) : (
        <Textarea
          className={fieldClass}
          name={name}
          defaultValue={value}
          required={required}
          maxLength={12000}
          rows={2}
        />
      )}
    </label>
  );
}
export function ExperimentLab({
  projectId,
  initial,
  questions,
  initialNode,
  initialClaim = "",
  startNew = false,
  prompts,
  names = {},
  save,
  reload,
  exportBrief,
}: Props) {
  const t = useT();
  const [items, setItems] = useState(initial),
    [selected, setSelected] = useState(initial[0]?.id ?? ""),
    [creating, setCreating] = useState(startNew || !initial.length),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [brief, setBrief] = useState("");
  const e = items.find((x) => x.id === selected);
  const plan = e?.plans.at(-1);
  const who = (id: string) => names[id] ?? t("Former member");
  const when = (value: string) =>
    new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC");
  async function perform(op: LabOperation | { kind: "create"; plan: Plan }) {
    setBusy(true);
    setMessage("");
    try {
      const result = await save(projectId, e?.id ?? null, e?.revision ?? 0, op);
      if (result.error) {
        setMessage(t(result.error));
        return false;
      }
      if (result.items) {
        setItems(result.items);
        if (op.kind === "create") {
          setSelected(result.items.at(-1)?.id ?? "");
          setCreating(false);
        }
        setMessage(t("Saved."));
        return true;
      }
      return false;
    } catch {
      setMessage(t("Could not save. Your draft is still here."));
      return false;
    } finally {
      setBusy(false);
    }
  }
  function form(
    label: string,
    operation: (data: FormData) => LabOperation | { kind: "create"; plan: Plan },
    children: ReactNode,
    reset = true,
  ) {
    return (
      <form
        className="grid gap-3"
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const form = event.currentTarget;
          if (await perform(operation(new FormData(form)))) {
            if (reset) form.reset();
          }
        }}
      >
        <fieldset disabled={busy} className="grid gap-3 min-w-0">
          {children}
          <Button type="submit" className="w-fit" pending={busy}>
            {t(label)}
          </Button>
        </fieldset>
      </form>
    );
  }
  function planForm(current: Plan, create: boolean) {
    return form(
      create ? "Create experiment" : "Save new plan version",
      (d) => ({
        kind: create ? "create" : "plan",
        plan: Object.fromEntries(
          Object.keys(empty).map((key) => [key, String(d.get(key) ?? "")]),
        ) as Plan,
      }),
      <>
        <Field
          name="claim"
          label={t("Claim · what do you want to learn?")}
          hint={prompts?.claim}
          value={current.claim}
          required
        />
        <Field
          name="method"
          label={t("Method · how will you test it?")}
          hint={prompts?.method}
          value={current.method}
          required
        />
        <Field
          name="criteria"
          label={t("Success criteria · what would count?")}
          hint={prompts?.criteria}
          value={current.criteria}
          required
        />
        <details>
          <summary className="cursor-pointer text-lime">
            {t("Scope, question, metrics and limits")}
          </summary>
          <div className="grid grid-cols-[repeat(auto-fit,_minmax(min(100%,_240px),_1fr))] gap-3 mt-3">
            {(["scope", "metric", "baseline", "owner", "limits", "milestone"] as const).map(
              (key) => (
                <Field
                  key={key}
                  name={key}
                  label={t(
                    {
                      scope: "Claim scope",
                      metric: "Metric and unit",
                      baseline: "Baseline (if known)",
                      owner: "Owner / responsible person",
                      limits: "Budget and action limits",
                      milestone: "Milestone (optional label)",
                    }[key],
                  )}
                  value={current[key]}
                />
              ),
            )}
            <label className="grid gap-1 text-[14px]">
              {t("Related question")}
              <Select className={fieldClass} name="nodeId" defaultValue={current.nodeId}>
                <option value="">{t("No question selected")}</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </details>
      </>,
      false,
    );
  }
  return (
    <div className="grid gap-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px]">{t("Experiment lab")}</h2>
          <p className="text-muted text-[14px]">
            {t("Ideas, analysis, evidence and reviewed conclusions stay distinct.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreating(!creating)}>
            {t(creating ? "Close new experiment" : "New experiment")}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await reload(projectId);
                if (result.items) setItems(result.items);
                setMessage(
                  result.error ??
                    t("Reloaded. Compare saved records with your draft before saving again."),
                );
              } catch {
                setMessage(t("Could not reload."));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Reload records")}
          </Button>
        </div>
      </div>
      <div role="status" className="text-[14px] text-lime whitespace-pre-wrap">
        {message}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,_minmax(min(100%,_140px),_1fr))] gap-2 text-[14px]">
        {[
          ["Framed claims", items.length],
          [
            "AI analysis",
            items.reduce(
              (n, x) => n + x.evidence.filter((v) => v.kind === "ai_analysis").length,
              0,
            ),
          ],
          [
            "External evidence",
            items.reduce(
              (n, x) => n + x.evidence.filter((v) => v.kind !== "ai_analysis").length,
              0,
            ),
          ],
          [
            "Completed runs",
            items.reduce((n, x) => n + x.runs.filter((v) => v.status === "completed").length, 0),
          ],
          ["Recorded reviews", items.reduce((n, x) => n + x.reviews.length, 0)],
        ].map(([label, count]) => (
          <div key={label} className="border border-line rounded-[12px] p-3 bg-panel">
            <span className="block text-muted">{t(String(label))}</span>
            <strong className="text-[20px] tabular-nums">{count}</strong>
          </div>
        ))}
      </div>
      {prompts && <p className="text-[12px] text-muted">{prompts.evidence}</p>}
      <p className="text-[12px] text-muted">
        {t(
          "These are records of exploration, not a viability score. Reviews apply only to their claim, scope and evidence snapshot.",
        )}
      </p>
      {creating && (
        <section className="rounded-[18px] border border-line p-4 bg-panel">
          <h3 className="text-[18px] mb-3">{t("Frame an experiment")}</h3>
          {initialClaim && (
            <p className="text-[12px] text-muted mb-3">
              {t(
                "Copied from your idea or answer as an untested claim. Edit it, then define the method and criterion before saving.",
              )}
            </p>
          )}
          {planForm(
            {
              ...empty,
              claim: initialClaim,
              nodeId: questions.some((q) => q.id === initialNode) ? (initialNode ?? "") : "",
            },
            true,
          )}
        </section>
      )}
      <div className="grid lg:grid-cols-[repeat(12,minmax(0,1fr))] gap-4 min-w-0">
        <aside className="grid content-start gap-2 lg:col-span-3" aria-label={t("Experiments")}>
          {!items.length && (
            <p className="text-muted">
              {t("Start with one uncertainty. No commercial validation is required.")}
            </p>
          )}
          {items.map((item) => (
            <Button
              key={item.id}
              variant={item.id === selected ? "primary" : "secondary"}
              className="text-left justify-start wrap-anywhere"
              aria-pressed={item.id === selected}
              onClick={() => {
                setSelected(item.id);
                setBrief("");
              }}
            >
              {item.plans.at(-1)?.definition.claim}
            </Button>
          ))}
        </aside>
        {e && plan && (
          <section
            key={e.id}
            className="min-w-0 rounded-[18px] border border-line bg-panel p-4 grid gap-5 lg:col-span-9"
          >
            <header>
              <p className="text-[12px] text-muted">
                {t("Plan version")} {plan.version}{" "}
                {plan.definition.milestone && `· ${plan.definition.milestone}`}
              </p>
              <h3 className="text-[20px] wrap-anywhere">{plan.definition.claim}</h3>
              <p className="whitespace-pre-wrap text-[14px] mt-2">{plan.definition.method}</p>
              <p className="whitespace-pre-wrap text-[14px] mt-2">
                <strong>{t("Success criteria")}: </strong>
                {plan.definition.criteria}
              </p>
              {plan.definition.scope && (
                <p className="text-[14px] whitespace-pre-wrap">
                  {t("Claim scope")}: {plan.definition.scope}
                </p>
              )}
              {questions
                .filter((q) => q.id === plan.definition.nodeId)
                .map((q) => (
                  <Link
                    key={q.id}
                    className="text-lime underline text-[14px]"
                    href={`/projects/${projectId}?stage=${encodeURIComponent(q.stageId)}&node=${encodeURIComponent(q.id)}`}
                  >
                    {t("Related question")}: {q.label}
                  </Link>
                ))}
            </header>
            <details>
              <summary className="cursor-pointer text-lime">
                {t("Edit next plan · earlier runs keep their version")}
              </summary>
              <div className="mt-3">{planForm(plan.definition, false)}</div>
            </details>
            <details>
              <summary className="cursor-pointer text-lime">{t("Plan history")}</summary>
              {e.plans.map((p) => (
                <article key={p.id} className="border-t border-line py-3 text-[14px]">
                  <strong>
                    {t("Plan version")} {p.version}
                  </strong>
                  <p>
                    {who(p.author_id)} · {when(p.created_at)}
                  </p>
                  <dl className="grid gap-2 mt-2">
                    {Object.entries(p.definition)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-muted">{t(k)}</dt>
                          <dd className="whitespace-pre-wrap wrap-anywhere">{v}</dd>
                        </div>
                      ))}
                  </dl>
                </article>
              ))}
            </details>
            <section className="border-t border-line py-4">
              <h4 className="font-bold mb-3">{t("Start a run")}</h4>
              {form(
                "Start run",
                (d) => ({ kind: "start", executor: String(d.get("executor")) }),
                <Field name="executor" label={t("Executor · person or external agent")} required />,
              )}
              <p className="text-[12px] text-muted mt-2">
                {t(
                  "Starting saves the plan and selected question snapshot. Work executes outside Nakama.",
                )}
              </p>
            </section>
            {[...e.runs].reverse().map((run, index) => {
              const runEvidence = e.evidence.filter((v) => v.run_id === run.id);
              const reviews = e.reviews.filter((v) => v.run_id === run.id);
              return (
                <article
                  key={run.id}
                  className="border border-line rounded-lg p-4 grid gap-4 min-w-0"
                >
                  <header>
                    <h4 className="font-bold">
                      {t("Run")} {e.runs.length - index} · {t(run.status)}
                    </h4>
                    <p className="text-[12px] text-muted">
                      {run.executor} · {who(run.started_by)} · {when(run.started_at)}
                    </p>
                    <p className="text-[12px] text-muted">
                      {t("Plan version")} {e.plans.find((p) => p.id === run.plan_id)?.version}
                    </p>
                    {run.stale && (
                      <p role="note" className="text-[14px] text-lime">
                        {t(
                          "Context changed · reconcile before accepting results or recording a review.",
                        )}
                      </p>
                    )}
                  </header>
                  <details>
                    <summary className="text-lime cursor-pointer">
                      {t("Scoped agent brief")}
                    </summary>
                    <p className="text-[14px] my-2">
                      {t(
                        "Preview before sharing with another service. Only this run plan and selected question are included; linked documents are not fetched.",
                      )}
                    </p>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const result = await exportBrief(projectId, e.id, run.id);
                          setBrief(result.brief ?? "");
                          setMessage(result.error ? t(result.error) : "");
                        } catch {
                          setMessage(t("Could not prepare the brief."));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {t("Preview brief")}
                    </Button>
                  </details>
                  {run.status === "running" ? (
                    <details>
                      <summary className="text-lime cursor-pointer">
                        {t("Complete or cancel run")}
                      </summary>
                      <div className="mt-3">
                        {form(
                          "Record execution outcome",
                          (d) => ({
                            kind: "finish",
                            runId: run.id,
                            status: d.get("status") === "cancelled" ? "cancelled" : "completed",
                            effortMinutes:
                              String(d.get("effort") ?? "").trim() === ""
                                ? null
                                : Number(d.get("effort")),
                            cost: String(d.get("cost") ?? ""),
                            deviations: String(d.get("deviations") ?? ""),
                          }),
                          <>
                            <label>
                              {t("Execution status")}
                              <Select className={fieldClass} name="status">
                                <option value="completed">{t("Completed")}</option>
                                <option value="cancelled">{t("Cancelled")}</option>
                              </Select>
                            </label>
                            <Field
                              name="effort"
                              label={t("Human effort (minutes, blank if unknown)")}
                              numeric
                            />
                            <Field name="cost" label={t("Actual cost and currency (if known)")} />
                            <Field name="deviations" label={t("Deviations and limitations")} />
                            <p className="text-[12px] text-muted">
                              {t(
                                "Completion records execution, not support for the claim. The outcome is retained; use a new run for another attempt.",
                              )}
                            </p>
                          </>,
                        )}
                      </div>
                    </details>
                  ) : (
                    <dl className="grid grid-cols-[repeat(auto-fit,_minmax(min(100%,_240px),_1fr))] gap-2 text-[14px]">
                      <div>
                        <dt className="text-muted">{t("Human effort")}</dt>
                        <dd>
                          {run.effort_minutes === null
                            ? t("Not recorded")
                            : `${run.effort_minutes} min`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t("Actual cost")}</dt>
                        <dd>{run.cost ?? t("Not recorded")}</dd>
                      </div>
                      <div className="lg:[grid-column:1_/_-1]">
                        <dt className="text-muted">{t("Deviations and limitations")}</dt>
                        <dd className="whitespace-pre-wrap">
                          {run.deviations || t("Not recorded")}
                        </dd>
                      </div>
                    </dl>
                  )}
                  <details>
                    <summary className="text-lime cursor-pointer">
                      {t("Add evidence or measurement")}
                    </summary>
                    <div className="mt-3">
                      {form(
                        "Retain evidence",
                        (d) => ({
                          kind: "evidence",
                          runId: run.id,
                          evidenceKind: d.get("kind") as "observation",
                          content: String(d.get("content")),
                          source: String(d.get("source")),
                          measurement: String(d.get("measurement") ?? ""),
                          unit: String(d.get("unit") ?? ""),
                        }),
                        <>
                          <label>
                            {t("Evidence type")}
                            <Select className={fieldClass} name="kind">
                              <option value="observation">{t("Observation")}</option>
                              <option value="external_evidence">{t("External evidence")}</option>
                              <option value="measurement">{t("Measurement")}</option>
                              <option value="ai_analysis">{t("AI analysis")}</option>
                            </Select>
                          </label>
                          <Field
                            name="content"
                            label={t("Retained evidence · observation, excerpt or data")}
                            required
                          />
                          <Field
                            name="source"
                            label={t(
                              "Source and attribution · URL, artifact reference or observation details",
                            )}
                            required
                          />
                          <Field
                            name="measurement"
                            label={t("Measured value (blank if unknown)")}
                          />
                          <Field name="unit" label={t("Unit")} />
                          <p className="text-[12px] text-muted">
                            {t(
                              "Evidence is retained as entered. Links can change; include the actual observation or excerpt. Add a correction as new evidence.",
                            )}
                          </p>
                        </>,
                      )}
                    </div>
                  </details>
                  <div className="grid gap-2">
                    {runEvidence.map((v) => (
                      <article key={v.id} className="border border-line p-3 text-[14px]">
                        <strong>{t(v.kind)}</strong>
                        <p className="whitespace-pre-wrap wrap-anywhere">{v.content}</p>
                        <p className="text-muted whitespace-pre-wrap wrap-anywhere">{v.source}</p>
                        {v.measurement !== null && (
                          <p>
                            {v.measurement} {v.unit}
                          </p>
                        )}
                        <small>
                          {who(v.author_id)} · {when(v.recorded_at)}
                        </small>
                      </article>
                    ))}
                  </div>
                  <details>
                    <summary className="text-lime cursor-pointer">
                      {t("Attach an agent contribution for review")}
                    </summary>
                    <div className="mt-3">
                      {form(
                        "Submit proposal",
                        (d) => ({
                          kind: "propose",
                          runId: run.id,
                          agent: String(d.get("agent")),
                          content: String(d.get("content")),
                          source: String(d.get("source")),
                        }),
                        <>
                          <Field name="agent" label={t("Agent / model attribution")} required />
                          <Field name="content" label={t("Proposed contribution")} required />
                          <Field name="source" label={t("Sources and uncertainty")} required />
                        </>,
                      )}
                    </div>
                  </details>
                  {e.proposals
                    .filter((p) => p.run_id === run.id)
                    .map((p) => (
                      <section
                        key={p.id}
                        className="border border-line p-3 rounded-md text-[14px] grid gap-2"
                      >
                        <strong>
                          {t("AI proposal")} · {p.agent} · {t(p.status)}
                        </strong>
                        <p className="whitespace-pre-wrap wrap-anywhere">{p.content}</p>
                        <p className="text-muted whitespace-pre-wrap">{p.source}</p>
                        <small>
                          {t("Submitted by")} {who(p.submitted_by)} · {when(p.created_at)}
                        </small>
                        {p.status === "pending" ? (
                          form(
                            "Review contribution",
                            (d) => ({
                              kind: "resolve",
                              proposalId: p.id,
                              decision: d.get("decision") as "accepted",
                              content: String(d.get("content") ?? ""),
                              note: String(d.get("note")),
                              acknowledgeStale: d.get("acknowledgeStale") === "on",
                            }),
                            <>
                              <label>
                                {t("Decision")}
                                <Select name="decision" className={fieldClass}>
                                  <option value="accepted">{t("Accept as AI analysis")}</option>
                                  <option value="edited">{t("Edit and accept")}</option>
                                  <option value="rejected">{t("Reject")}</option>
                                </Select>
                              </label>
                              <Field
                                name="content"
                                label={t("Edited contribution (when editing)")}
                                value={p.content}
                              />
                              <Field
                                name="note"
                                label={t("Review note · reconcile changed context and sources")}
                                required
                              />
                              {run.stale && (
                                <label className="flex gap-2 items-start">
                                  <Input type="checkbox" name="acknowledgeStale" />
                                  <span>
                                    {t(
                                      "I reviewed the changed inputs and reconciled them in the note.",
                                    )}
                                  </span>
                                </label>
                              )}
                            </>,
                          )
                        ) : (
                          <>
                            <p>{p.accepted_content}</p>
                            <p>{p.review_note}</p>
                            <small>
                              {t("Reviewed by")} {p.reviewer_id ? who(p.reviewer_id) : ""} ·{" "}
                              {p.reviewed_at ? when(p.reviewed_at) : ""}
                            </small>
                          </>
                        )}
                      </section>
                    ))}
                  {run.status === "completed" && (
                    <details>
                      <summary className="text-lime cursor-pointer">
                        {t("Review claim against evidence")}
                      </summary>
                      <div className="mt-3">
                        {form(
                          "Record review",
                          (d) => ({
                            kind: "review",
                            runId: run.id,
                            assessment: d.get("assessment") as "inconclusive",
                            nextAction: d.get("nextAction") as "continue",
                            rationale: String(d.get("rationale")),
                            reconciliation: String(d.get("reconciliation") ?? ""),
                          }),
                          <>
                            <label>
                              {t("Claim assessment")}
                              <Select
                                className={fieldClass}
                                name="assessment"
                                defaultValue="inconclusive"
                              >
                                <option value="inconclusive">{t("Inconclusive")}</option>
                                <option value="supported">{t("Supported")}</option>
                                <option value="contradicted">{t("Contradicted")}</option>
                              </Select>
                            </label>
                            <label>
                              {t("Next action")}
                              <Select className={fieldClass} name="nextAction">
                                <option value="continue">{t("Continue")}</option>
                                <option value="revise">{t("Revise")}</option>
                                <option value="stop">{t("Stop")}</option>
                              </Select>
                            </label>
                            <Field
                              name="rationale"
                              label={t("Rationale, scope and remaining uncertainty")}
                              required
                            />
                            <Field
                              name="reconciliation"
                              label={t("Changed context · reconciliation")}
                              required={run.stale}
                            />
                          </>,
                        )}
                      </div>
                    </details>
                  )}
                  {reviews.map((r, i) => (
                    <section
                      key={r.id}
                      className="bg-panel border border-line rounded-md p-3 text-[14px]"
                    >
                      <strong>
                        {t("Review")} {i + 1} · {t(r.assessment)} · {t(r.next_action)}
                      </strong>
                      <p className="whitespace-pre-wrap">{r.rationale}</p>
                      {r.reconciliation && (
                        <p className="whitespace-pre-wrap">{r.reconciliation}</p>
                      )}
                      <small>
                        {who(r.author_id)} · {when(r.created_at)}
                      </small>
                      {(run.stale || r.snapshot.evidence.length !== runEvidence.length) && (
                        <p className="text-lime">
                          {t(
                            "Later context or evidence exists. This review describes its saved snapshot.",
                          )}
                        </p>
                      )}
                      <details>
                        <summary className="cursor-pointer">
                          {t("Inspect reviewed evidence snapshot")}
                        </summary>
                        <p>{r.snapshot.plan.definition.claim}</p>
                        <p>{r.snapshot.plan.definition.criteria}</p>
                        <p>
                          {r.snapshot.run.context.prompt}:{" "}
                          {r.snapshot.run.context.content || t("Not answered")}
                        </p>
                        {r.snapshot.evidence.map((v) => (
                          <div
                            className="border-t border-line py-2 whitespace-pre-wrap wrap-anywhere"
                            key={v.id}
                          >
                            {t(v.kind)} · {v.content}
                            <p>{v.source}</p>
                            <p>
                              {v.measurement} {v.unit}
                            </p>
                          </div>
                        ))}
                      </details>
                    </section>
                  ))}
                </article>
              );
            })}
          </section>
        )}
      </div>
      {brief && (
        <section className="border border-line rounded-lg p-4 grid gap-3">
          <h3>{t("Brief preview · sharing is your choice")}</h3>
          <Textarea
            aria-label={t("Scoped brief")}
            readOnly
            value={brief}
            rows={16}
            className={fieldClass}
          />
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(brief);
                  setMessage(t("Copied."));
                } catch {
                  setMessage(t("Copy unavailable. Select the brief text to copy it manually."));
                }
              }}
            >
              {t("Copy brief")}
            </Button>
            <Button variant="secondary" onClick={() => setBrief("")}>
              {t("Close preview")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
