"use client";
import { Button } from "@/shared/ui/button";
import { useT } from "@/shared/i18n/provider";
import { Feedback } from "@/shared/ui/feedback";
import { useActionState, useEffect, useRef, useState } from "react";
import { Input, Select, Textarea } from "@/shared/ui/controls";
import { Panel } from "@/shared/ui/panel";
import { useLocale } from "@/shared/i18n/provider";
import { formatDate } from "@/shared/i18n/index";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveAnswer, type GuidanceActionState } from "../actions";
import type { FlowNode, NodeStatus } from "../model/flows";
import type { Answer, Revision } from "../model/types";
const initial: GuidanceActionState = {};
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
  answer?: Answer | undefined;
  history: Revision[];
  names: Record<string, string>;
  backHref: string;
}) {
  const t = useT();
  const router = useRouter();
  const locale = useLocale();
  const [content, setContent] = useState(answer?.content ?? "");
  const [status, setStatus] = useState<NodeStatus>(answer?.status ?? "draft");
  const [choice, setChoice] = useState(answer?.choice ?? "");
  const [revision, setRevision] = useState(answer?.revision ?? 0);
  const [dirty, setDirty] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: GuidanceActionState, data: FormData) => {
      const result = await saveAnswer(projectId, node.id, previous, data);
      if (result.savedRevision) {
        setRevision(result.savedRevision);
        setDirty(false);
        router.push(backHref);
      }
      setReconciled(false);
      return result;
    },
    initial,
  );

  useEffect(() => {
    heading.current?.focus();
  }, []);
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
        !window.confirm(t("Leave this unsaved draft?"))
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
  }, [dirty, t]);
  return (
    <Panel className="answer-panel">
      <Link href={backHref} className="back-link">
        {t("← Back to this stage")}{" "}
      </Link>
      <span className="eyebrow node-kind">
        {node.kind === "question"
          ? t("QUESTION")
          : node.kind === "action"
            ? t("ACTIVITY")
            : t("DECISION")}
      </span>
      <h2 ref={heading} tabIndex={-1}>
        {t(node.question)}
      </h2>
      <details className="example">
        <summary>{t("Example")}</summary>
        <p>{t(node.example)}</p>
        <small>{t("This is an example, not an answer saved for your project.")}</small>
      </details>
      {answer?.needs_review && (
        <p className="review-warning">
          {t("Something earlier changed. Revisit this answer with what you know now.")}{" "}
        </p>
      )}
      <form action={action} className="form-stack answer-form">
        <Input type="hidden" name="revision" value={revision} />
        <label htmlFor="answer">{t("Your answer, learning, or uncertainty")}</label>
        <Textarea
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
          placeholder={t("It's okay to say what you don't know yet.")}
        />
        {node.choices && (
          <>
            <label htmlFor="choice">{t("Your direction")}</label>
            <Select
              disabled={pending}
              id="choice"
              name="choice"
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value);
                setDirty(true);
              }}
            >
              <option value="">{t("Not decided yet")}</option>
              {node.choices.map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </Select>
          </>
        )}
        <label htmlFor="status">{t("Where does this stand?")}</label>
        <Select
          disabled={pending}
          id="status"
          name="status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as NodeStatus);
            setDirty(true);
          }}
        >
          <option value="draft">{t("Draft — still thinking")}</option>
          <option value="answered">{t("Answered — including an honest unknown")} </option>
          <option value="blocked">{t("Blocked — explain the help you need")}</option>
          <option value="skipped">{t("Skipped — explain why")}</option>
          <option value="unanswered">{t("Unanswered — clear the current answer")} </option>
        </Select>
        <small>
          {t("Answered means recorded, not proven right. Earlier revisions stay in history.")}{" "}
        </small>
        <Feedback
          state={{
            ...(state.error ? { error: state.error } : {}),
            ...(!dirty && state.success ? { success: state.success } : {}),
          }}
        />
        {answer && (
          <small>
            {t("Saved by")} {names[answer.updated_by] || t("a former member")} {t("· Revision")}{" "}
            {answer.revision}
          </small>
        )}
        {state.conflict && (
          <div className="conflict">
            <h3>{t("Newer answer available")}</h3>
            <p className="preserve-lines">{state.conflict.content || t("(No text)")}</p>
            <small>
              {t(state.conflict.status)} · {t(state.conflict.choice ?? "No direction selected")}{" "}
              {t("· Revision")} {state.conflict.revision}
            </small>
            <div className="conflict-actions">
              <Button
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
                {t("Start from their version")}{" "}
              </Button>
              <Button
                type="button"
                className="secondary"
                onClick={() => {
                  setRevision(state.conflict!.revision);
                  setReconciled(true);
                }}
              >
                {t("Keep my version")}{" "}
              </Button>
            </div>
          </div>
        )}
        <div className="save-row">
          <Button type="submit" disabled={pending || Boolean(state.conflict && !reconciled)}>
            {pending ? t("Saving…") : t("Save this step")}
          </Button>
          <span role="status">
            {pending ? t("Saving") : dirty ? t("Unsaved changes") : t("Up to date")}
          </span>
        </div>
      </form>
      {history.length > 0 && (
        <details className="history">
          <summary>
            {t("Earlier work ·")} {history.length}{" "}
            {history.length === 1 ? t("revision") : t("revisions")}
          </summary>
          {history.map((r) => (
            <article key={r.revision}>
              <strong>
                {t("Revision")} {r.revision} · {t(r.status)}
              </strong>
              <small>
                {r.origin === "capture"
                  ? t("From the original project capture")
                  : t("Saved by {name}", {
                      name: names[r.author_id] || t("a former member"),
                    })}{" "}
                · {formatDate(r.created_at, locale)}
              </small>
              {r.choice && (
                <p>
                  {t("Direction:")} {t(r.choice)}
                </p>
              )}
              <p className="preserve-lines">{r.content || t("(No text)")}</p>
            </article>
          ))}
        </details>
      )}
    </Panel>
  );
}
