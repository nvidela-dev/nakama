"use client";
import { Button } from "@/shared/ui/button";
import { useT } from "@/shared/i18n/provider";
import { Feedback } from "@/shared/ui/feedback";
import { useActionState, useEffect, useRef, useState } from "react";
import { AnswerFields } from "./answer-fields";
import { Input } from "@/shared/ui/controls";
import { Panel } from "@/shared/ui/panel";
import { useLocale } from "@/shared/i18n/provider";
import { formatDate } from "@/shared/i18n/date";
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
    <Panel className={"answer-panel max-[700px]:p-5"}>
      <Link href={backHref} className={"back-link text-[13px] text-muted"}>
        {t("← Back to this stage")}{" "}
      </Link>
      <span
        className={
          "eyebrow node-kind text-[10px] tracking-[2px] text-lime font-bold block mb-5.5 [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px] mt-7 lg:compact:mt-3"
        }
      >
        {node.kind === "question"
          ? t("QUESTION")
          : node.kind === "action"
            ? t("ACTIVITY")
            : t("DECISION")}
      </span>
      <h2
        ref={heading}
        tabIndex={-1}
        className={
          "mb-[0.83em] mt-0 font-mono font-medium text-[16px] leading-[1.3] tracking-[-0.25px] lg:compact:my-1.5 lg:compact:mx-0 lg:compact:text-[14px] focus:[outline:none]"
        }
      >
        {t(node.question)}
      </h2>
      <details
        className={
          "example bg-[var(--theme-surface,#263a2c)] [border-left:2px_solid_var(--theme-border,#adc57f)] py-3.5 px-4.5 my-6 mx-0 lg:compact:py-2 lg:compact:px-3 lg:compact:my-3"
        }
      >
        <summary
          className={
            "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 text-[13px] cursor-pointer"
          }
        >
          {t("Example")}
        </summary>
        <p className={"text-[13px] mt-3.5 mx-0 mb-2 lg:compact:mt-2 lg:compact:mb-1.25"}>
          {t(node.example)}
        </p>
        <small className={"text-[10px] text-muted"}>
          {t("This is an example, not an answer saved for your project.")}
        </small>
      </details>
      {answer?.needs_review && (
        <p
          className={
            "review-warning mb-[1em] mt-0 text-[13px] bg-[var(--theme-warning,#3c3e28)] p-3.75 rounded-[8px] lg:compact:p-2.5 lg:compact:my-2.5 lg:compact:mx-0"
          }
        >
          {t("Something earlier changed. Revisit this answer with what you know now.")}{" "}
        </p>
      )}
      <form
        action={action}
        className={
          "form-stack answer-form flex flex-col gap-3 [&_label]:text-[13px] [&_label]:text-ink [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[var(--theme-border,#4b6056)] [&_textarea]:bg-bg [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_select]:bg-bg [&_select]:text-ink [&_select]:border [&_select]:border-[var(--theme-border,#4b6056)] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:outline-3 [&_select:focus-visible]:outline-solid [&_select:focus-visible]:outline-lime [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5 lg:compact:[&_#answer]:min-h-37.5 min-w-0 [&_>_textarea]:w-full [&_>_textarea]:min-w-0 [&_>_textarea]:max-w-full [&_>_select]:w-full [&_>_select]:min-w-0 [&_>_select]:max-w-full"
        }
      >
        <Input
          type="hidden"
          name="revision"
          value={revision}
          className={
            "w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
          }
        />
        <AnswerFields
          node={node}
          content={content}
          status={status}
          choice={choice}
          pending={pending}
          onContentChange={(value) => {
            setContent(value);
            setDirty(true);
          }}
          onChoiceChange={(value) => {
            setChoice(value);
            setDirty(true);
          }}
          onStatusChange={(value) => {
            setStatus(value);
            setDirty(true);
          }}
        />
        <Feedback
          state={{
            ...(state.error ? { error: state.error } : {}),
            ...(!dirty && state.success ? { success: state.success } : {}),
          }}
        />
        {answer && (
          <small className={"text-[11px] text-muted"}>
            {t("Saved by")} {names[answer.updated_by] || t("a former member")} {t("· Revision")}{" "}
            {answer.revision}
          </small>
        )}
        {state.conflict && (
          <div className={"conflict border border-[var(--theme-border,#b59769)] p-4 rounded-[8px]"}>
            <h3
              className={
                "mb-[1em] font-mono tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 mt-0"
              }
            >
              {t("Newer answer available")}
            </h3>
            <p
              className={
                "preserve-lines mb-[1em] mt-0 whitespace-pre-wrap wrap-anywhere text-[13px]"
              }
            >
              {state.conflict.content || t("(No text)")}
            </p>
            <small className={"text-[11px] text-muted"}>
              {t(state.conflict.status)} · {t(state.conflict.choice ?? "No direction selected")}{" "}
              {t("· Revision")} {state.conflict.revision}
            </small>
            <div className={"conflict-actions flex flex-wrap gap-2"}>
              <Button
                type="button"
                className={"secondary mt-2 lg:compact:mt-1 text-[12px]"}
                onClick={() => {
                  setContent(state.conflict!.content);
                  setStatus(state.conflict!.status);
                  setChoice(state.conflict!.choice ?? "");
                  setRevision(state.conflict!.revision);
                  setReconciled(true);
                  setDirty(true);
                }}
                variant="secondary"
              >
                {t("Start from their version")}{" "}
              </Button>
              <Button
                type="button"
                className={"secondary mt-2 lg:compact:mt-1 text-[12px]"}
                onClick={() => {
                  setRevision(state.conflict!.revision);
                  setReconciled(true);
                }}
                variant="secondary"
              >
                {t("Keep my version")}{" "}
              </Button>
            </div>
          </div>
        )}
        <div className={"save-row flex items-center gap-4 flex-wrap"}>
          <Button
            type="submit"
            disabled={pending || Boolean(state.conflict && !reconciled)}
            className={"mt-2 lg:compact:mt-1"}
          >
            {pending ? t("Saving…") : t("Save answer")}
          </Button>
          <span role="status" className={"text-[11px] text-muted"}>
            {pending ? t("Saving") : dirty ? t("Unsaved changes") : t("Up to date")}
          </span>
        </div>
      </form>
      {history.length > 0 && (
        <details
          className={
            "history border-t border-t-line mt-7 pt-5 text-[12px] lg:compact:pt-2.5 lg:compact:mt-3.5"
          }
        >
          <summary
            className={
              "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 cursor-pointer text-lime"
            }
          >
            {t("Earlier work ·")} {history.length}{" "}
            {history.length === 1 ? t("revision") : t("revisions")}
          </summary>
          {history.map((r) => (
            <article
              key={r.revision}
              className={"border-b border-b-line py-5 px-0 lg:compact:py-3"}
            >
              <strong>
                {t("Revision")} {r.revision} · {t(r.status)}
              </strong>
              <small className={"block text-muted mt-1.25 mx-0 mb-3.5"}>
                {r.origin === "capture"
                  ? t("From the original project capture")
                  : t("Saved by {name}", {
                      name: names[r.author_id] || t("a former member"),
                    })}{" "}
                · {formatDate(r.created_at, locale)}
              </small>
              {r.choice && (
                <p className={"text-[12px] m-0"}>
                  {t("Direction:")} {t(r.choice)}
                </p>
              )}
              <p className={"preserve-lines whitespace-pre-wrap wrap-anywhere text-[12px] m-0"}>
                {r.content || t("(No text)")}
              </p>
            </article>
          ))}
        </details>
      )}
    </Panel>
  );
}
