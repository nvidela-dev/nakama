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
    <form action={action} className="form-stack comment-compose">
      <label htmlFor="new-comment">{t("Add a comment")}</label>
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
        <p className="message error" role="alert">
          {t("This link would exceed the comment limit. Shorten your draft first.")}
        </p>
      )}
      <Feedback state={state} />
      <Button
        type="submit"
        disabled={pending}
        aria-label={pending ? t("Posting…") : t("Post comment")}
        title={t("Post comment")}
      >
        <Icon name="arrowRight" />
      </Button>
    </form>
  );
}
