"use client";
import { Button } from "@/shared/ui/button";
import { useT } from "@/shared/i18n/provider";
import { Feedback } from "@/shared/ui/feedback";
import { useActionState, useState } from "react";
import { Input, Textarea } from "@/shared/ui/controls";
import { reviewStage, type GuidanceActionState } from "../actions";
const initial: GuidanceActionState = {};
export function StageReviewForm({
  projectId,
  stageId,
  contentRevision,
}: {
  projectId: string;
  stageId: string;
  contentRevision: number;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(
    reviewStage.bind(null, projectId, stageId),
    initial,
  );
  const [text, setText] = useState("");
  return (
    <details className="stage-review">
      <summary>{t("Ready to review this stage?")}</summary>
      <p>
        {t(
          "Not every question needs an answer. Record what you've decided and what remains unknown.",
        )}{" "}
      </p>
      <form action={action} className="form-stack">
        <Input type="hidden" name="revision" value={contentRevision} />
        <label htmlFor="rationale">{t("What should we remember?")}</label>
        <Textarea
          id="rationale"
          name="rationale"
          maxLength={2000}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Feedback state={state} />
        <Button type="submit" disabled={pending} className="secondary">
          {pending ? t("Saving review…") : t("Mark stage reviewed")}
        </Button>
      </form>
    </details>
  );
}
