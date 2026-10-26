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
      className="form-stack comment-compose grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-[5px_8px] mt-3 pt-2.25 border-t border-line [&_>_.message]:col-span-full"
    >
      <label htmlFor="new-comment" className={"text-ink [grid-column:1_/_-1] text-[11px]"}>
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
        className="col-start-2 row-start-2 min-h-9.5 max-h-40 w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[14px] py-1.75 px-2.25 text-[12px] leading-[1.4] resize-y"
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
            "message error text-[13px]! rounded-[8px] p-3 text-ink! m-0 bg-[var(--theme-danger,#4e3030)] [color:var(--theme-danger-ink,#ffe4dd)]!"
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
        className="col-start-3 row-start-2 w-9 min-h-9 p-2 rounded-full pointer-coarse:w-11 pointer-coarse:min-h-11"
      >
        <Icon name="arrowRight" />
      </Button>
    </form>
  );
}
