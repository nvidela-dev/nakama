"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  chooseFlow,
  reviewStage,
  saveAnswer,
  type GuidanceActionState,
} from "@/app/guidance-actions";
import { flows, type FlowNode, type NodeStatus } from "@/lib/flows";
import type { Answer, Revision } from "@/lib/guidance";
import { Feedback } from "./forms";
const initial: GuidanceActionState = {};
export function FlowChooser({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    chooseFlow.bind(null, projectId),
    initial,
  );
  return (
    <section className="panel">
      <span className="eyebrow">A LITTLE DIRECTION</span>
      <h2>What kind of adventure?</h2>
      <p>Both start small. Pick the path that feels right for this idea.</p>
      <form action={action}>
        <div className="flow-options">
          {Object.values(flows).map((flow) => (
            <button
              className="flow-option"
              key={flow.id}
              name="flow"
              value={flow.id}
              disabled={pending}
            >
              <span aria-hidden="true">
                {flow.id === "venture" ? "↗" : "✳"}
              </span>
              <strong>{flow.name}</strong>
              <span>{flow.description}</span>
            </button>
          ))}
        </div>
        <Feedback state={state} />
        <small className="muted">
          You can revisit any stage. Switching paths after choosing isn't
          available yet.
        </small>
      </form>
    </section>
  );
}
export function AnswerEditor({
  projectId,
  node,
  answer,
  history,
  names,
  backHref,
}: {
  projectId: string;
  node: FlowNode;
  answer?: Answer;
  history: Revision[];
  names: Record<string, string>;
  backHref: string;
}) {
  const [state, action, pending] = useActionState(
    saveAnswer.bind(null, projectId, node.id),
    initial,
  );
  const [content, setContent] = useState(answer?.content ?? "");
  const [status, setStatus] = useState<NodeStatus>(answer?.status ?? "draft");
  const [choice, setChoice] = useState(answer?.choice ?? "");
  const [revision, setRevision] = useState(answer?.revision ?? 0);
  const [dirty, setDirty] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (state.savedRevision) {
      setRevision(state.savedRevision);
      setDirty(false);
    }
    setReconciled(false);
  }, [state]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const linkGuard = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a");
      if (
        link &&
        link.href !== window.location.href &&
        !window.confirm("Leave this unsaved draft?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", guard);
    document.addEventListener("click", linkGuard, true);
    return () => {
      window.removeEventListener("beforeunload", guard);
      document.removeEventListener("click", linkGuard, true);
    };
  }, [dirty]);
  return (
    <section className="panel answer-panel">
      <Link href={backHref} className="back-link">
        ← Back to this stage
      </Link>
      <span className="eyebrow node-kind">
        {node.kind === "question"
          ? "ONE QUESTION AT A TIME"
          : node.kind === "action"
            ? "TRY A LITTLE SOMETHING"
            : "A MOMENT TO DECIDE"}
      </span>
      <h2 ref={heading} tabIndex={-1}>
        {node.question}
      </h2>
      <details className="example">
        <summary>A little inspiration</summary>
        <p>{node.example}</p>
        <small>This is an example, not an answer saved for your project.</small>
      </details>
      {answer?.needs_review && (
        <p className="review-warning">
          Something earlier changed. Revisit this answer with what you know now.
        </p>
      )}
      <form action={action} className="form-stack">
        <input type="hidden" name="revision" value={revision} />
        <label htmlFor="answer">Your answer, learning, or uncertainty</label>
        <textarea
          disabled={pending}
          id="answer"
          name="content"
          rows={7}
          maxLength={20000}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          placeholder="It's okay to say what you don't know yet."
        />
        {node.choices && (
          <>
            <label htmlFor="choice">Your direction</label>
            <select
              disabled={pending}
              id="choice"
              name="choice"
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value);
                setDirty(true);
              }}
            >
              <option value="">Not decided yet</option>
              {node.choices.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </>
        )}
        <label htmlFor="status">Where does this stand?</label>
        <select
          disabled={pending}
          id="status"
          name="status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as NodeStatus);
            setDirty(true);
          }}
        >
          <option value="draft">Draft — still thinking</option>
          <option value="answered">
            Answered — including an honest unknown
          </option>
          <option value="blocked">Blocked — explain the help you need</option>
          <option value="skipped">Skipped — explain why</option>
          <option value="unanswered">
            Unanswered — clear the current answer
          </option>
        </select>
        <small>
          Answered means recorded, not proven right. Earlier revisions stay in
          history.
        </small>
        <Feedback
          state={{
            error: state.error,
            success: dirty ? undefined : state.success,
          }}
        />
        {answer && (
          <small>
            Last saved by {names[answer.updated_by] || "a former member"} ·
            Revision {answer.revision}
          </small>
        )}
        {state.conflict && (
          <div className="conflict">
            <h3>A newer saved answer</h3>
            <p className="preserve-lines">
              {state.conflict.content || "(No text)"}
            </p>
            <small>
              {state.conflict.status} ·{" "}
              {state.conflict.choice ?? "No direction selected"} · Revision{" "}
              {state.conflict.revision}
            </small>
            <div className="conflict-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setContent(state.conflict!.content);
                  setStatus(state.conflict!.status);
                  setChoice(state.conflict!.choice ?? "");
                  setRevision(state.conflict!.revision);
                  setReconciled(true);
                  setDirty(true);
                }}
              >
                Start from their version
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setRevision(state.conflict!.revision);
                  setReconciled(true);
                }}
              >
                I've compared; keep my draft
              </button>
            </div>
          </div>
        )}
        <div className="save-row">
          <button disabled={pending || Boolean(state.conflict && !reconciled)}>
            {pending ? "Saving…" : "Save this step"}
          </button>
          <span role="status">
            {pending ? "Saving" : dirty ? "Unsaved changes" : "Up to date"}
          </span>
        </div>
      </form>
      {history.length > 0 && (
        <details className="history">
          <summary>
            Earlier work · {history.length}{" "}
            {history.length === 1 ? "revision" : "revisions"}
          </summary>
          {history.map((r) => (
            <article key={r.revision}>
              <strong>
                Revision {r.revision} · {r.status}
              </strong>
              <small>
                {r.origin === "capture"
                  ? "From the original project capture"
                  : `Saved by ${names[r.author_id] || "a former member"}`}{" "}
                · {new Date(r.created_at).toLocaleString()}
              </small>
              {r.choice && <p>Direction: {r.choice}</p>}
              <p className="preserve-lines">{r.content || "(No text)"}</p>
            </article>
          ))}
        </details>
      )}
    </section>
  );
}
export function StageReviewForm({
  projectId,
  stageId,
  contentRevision,
}: {
  projectId: string;
  stageId: string;
  contentRevision: number;
}) {
  const [state, action, pending] = useActionState(
    reviewStage.bind(null, projectId, stageId),
    initial,
  );
  const [text, setText] = useState("");
  return (
    <details className="stage-review">
      <summary>Ready to review this stage?</summary>
      <p>
        Not every question needs an answer. Record what you've decided and what
        remains unknown.
      </p>
      <form action={action} className="form-stack">
        <input type="hidden" name="revision" value={contentRevision} />
        <label htmlFor="rationale">What should we remember?</label>
        <textarea
          id="rationale"
          name="rationale"
          maxLength={2000}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Feedback state={state} />
        <button disabled={pending} className="secondary">
          {pending ? "Saving review…" : "Mark stage reviewed"}
        </button>
      </form>
    </details>
  );
}
