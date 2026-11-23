"use client";
import { projectPageHref } from "@/shared/navigation/project-href";
import { Eyebrow } from "@/shared/ui/workspace-layout";
import { ConflictBanner } from "@/shared/ui/form-patterns";
import { AnswerHistory } from "./answer-history";
import { useUnsavedDraftGuard } from "@/shared/lib/use-unsaved-draft-guard";
import { FormStack } from "@/shared/ui/workspace-layout";

import { Button } from "@/shared/ui/button";
import { useT } from "@/shared/i18n/provider";
import { Feedback } from "@/shared/ui/feedback";
import { useActionState, useEffect, useRef, useState } from "react";
import { AnswerFields } from "./answer-fields";
import { Panel } from "@/shared/ui/panel";
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
  hasOlderHistory = false,
  historyBefore,
  names,
  backHref,
}: {
  projectId: string;
  node: FlowNode;
  answer?: Answer | undefined;
  history: Revision[];
  hasOlderHistory?: boolean;
  historyBefore?: string | undefined;
  names: Record<string, string>;
  backHref: string;
}) {
  const t = useT();
  const router = useRouter();
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
  useUnsavedDraftGuard(dirty, t("Leave this unsaved draft?"));
  return (
    <Panel className={"answer-panel max-[700px]:p-5"}>
      <Link href={backHref} className={"back-link text-[13px] text-muted"}>
        {t("← Back to this stage")}{" "}
      </Link>
      <Eyebrow className="node-kind mb-3">
        {node.kind === "question"
          ? t("QUESTION")
          : node.kind === "action"
            ? t("ACTIVITY")
            : t("DECISION")}
      </Eyebrow>
      <h2
        ref={heading}
        tabIndex={-1}
        className={
          "mb-[0.83em] mt-0 font-sans font-medium text-[16px] leading-[1.3] tracking-[-0.25px] lg:compact:my-1.5 lg:compact:mx-0 lg:compact:text-[14px] focus:[outline:none]"
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
        <small className={"text-[11px] text-muted"}>
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
      <FormStack
        action={action}
        className="answer-form [&_label]:text-[13px] [&_label]:text-ink lg:compact:[&_#answer]:min-h-37.5 min-w-0 [&_>_textarea]:w-full [&_>_textarea]:min-w-0 [&_>_textarea]:max-w-full [&_>_select]:w-full [&_>_select]:min-w-0 [&_>_select]:max-w-full"
      >
        <input
          type="hidden"
          name="revision"
          value={revision}
          className={"w-full [resize:vertical]"}
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
          <ConflictBanner>
            <h3
              className={
                "mb-[1em] font-sans tracking-[-0.045em] text-[20px] font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 mt-0"
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
                className={"secondary mt-2 lg:compact:mt-1"}
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
                className={"secondary mt-2 lg:compact:mt-1"}
                onClick={() => {
                  setRevision(state.conflict!.revision);
                  setReconciled(true);
                }}
                variant="secondary"
              >
                {t("Keep my version")}{" "}
              </Button>
            </div>
          </ConflictBanner>
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
      </FormStack>
      {(history.length > 0 || historyBefore) && (
        <AnswerHistory
          latestHref={historyBefore ? projectPageHref(backHref, { node: node.id }) : undefined}
          olderHref={
            hasOlderHistory
              ? projectPageHref(backHref, {
                  node: node.id,
                  historyBefore: history.at(-1)?.revision.toString(),
                })
              : undefined
          }
          history={history}
          names={names}
        />
      )}
    </Panel>
  );
}
