"use client";
import { useRef, useState } from "react";
import { useT } from "@/shared/i18n/provider";
import { Textarea } from "@/shared/ui/controls";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";
import { Feedback } from "@/shared/ui/feedback";
import type { ActionState } from "@/shared/contracts/action-state";
import { ReferencePicker } from "./reference-picker";
import { insertReference, type ReferenceResults } from "../references";
export function CommentComposer({
  action,
  content,
  onContentChange,
  pending,
  state,
  loadReferences,
}: {
  action: (data: FormData) => void | Promise<void>;
  content: string;
  onContentChange: (value: string) => void;
  pending: boolean;
  state: ActionState;
  loadReferences: (search: string) => Promise<ReferenceResults>;
}) {
  const t = useT();
  const composer = useRef<HTMLTextAreaElement>(null);
  const [failedDraft, setFailedDraft] = useState<string>();
  const referenceError = failedDraft === content;
  return (
    <form
      action={action}
      className={
        "form-stack comment-compose flex flex-col gap-3 [&_small]:text-[11px] [&_small]:text-muted [&_select]:bg-[#101c1b] [&_select]:text-ink [&_select]:border [&_select]:border-[#4b6056] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:[outline:3px_solid_var(--color-lime)] [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 [&_input]:w-full [&_input]:border [&_input]:border-[#4b6056] [&_input]:bg-[#101c1b] [&_input]:text-ink [&_input]:rounded-[8px] [&_input]:p-3 [&_input]:text-[14px] [&_input]:[resize:vertical] lg:compact:[&_input]:py-2 lg:compact:[&_input]:px-2.5 lg:compact:[&_input]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5 mt-5 [&_>_.message]:[grid-column:1_/_-1]"
      }
    >
      <label htmlFor="new-comment" className={"text-ink [grid-column:1_/_-1] text-[10px]"}>
        {t("Add a comment")}
      </label>
      <Textarea
        disabled={pending}
        ref={composer}
        id="new-comment"
        name="content"
        value={content}
        onChange={(event) => {
          onContentChange(event.target.value);
          setFailedDraft(undefined);
        }}
        maxLength={4000}
        required
        rows={2}
        className={
          "min-h-30 w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:min-h-22.5 lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
        }
      />
      <ReferencePicker
        disabled={pending}
        load={loadReferences}
        onSelect={(item) => {
          const field = composer.current;
          const result = insertReference(
            content,
            item,
            field?.selectionStart ?? content.length,
            field?.selectionEnd ?? content.length,
          );
          if (!result) {
            setFailedDraft(content);
            return;
          }
          onContentChange(result.content);
          setFailedDraft(undefined);
          requestAnimationFrame(() => {
            field?.focus();
            field?.setSelectionRange(result.cursor, result.cursor);
          });
        }}
      />
      {referenceError && (
        <p
          className={
            "message error text-[13px]! rounded-[8px] p-3 text-ink! m-0 bg-[#4e3030] [color:#ffe4dd]!"
          }
          role="alert"
        >
          {t("This link would exceed the comment limit. Shorten your draft first.")}
        </p>
      )}
      <Feedback state={state} />
      <Button
        type="submit"
        disabled={pending}
        aria-label={pending ? t("Posting…") : t("Post comment")}
        title={t("Post comment")}
        className={"mt-2 lg:compact:mt-1"}
      >
        <Icon name="arrowRight" />
      </Button>
    </form>
  );
}
