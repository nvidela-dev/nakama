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
    <details className={"stage-review py-6 px-0 text-[13px] lg:compact:py-3.5"}>
      <summary
        className={
          "focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] cursor-pointer text-lime"
        }
      >
        {t("Ready to review this stage?")}
      </summary>
      <p className={"mb-[1em] text-muted mt-[14px]"}>
        {t(
          "Not every question needs an answer. Record what you've decided and what remains unknown.",
        )}{" "}
      </p>
      <form
        action={action}
        className={
          "form-stack flex flex-col gap-3 [&_small]:text-[11px] [&_small]:text-muted [&_select]:bg-[#101c1b] [&_select]:text-ink [&_select]:border [&_select]:border-[#4b6056] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:[outline:3px_solid_var(--color-lime)] [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
        }
      >
        <Input
          type="hidden"
          name="revision"
          value={contentRevision}
          className={
            "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
          }
        />
        <label htmlFor="rationale" className={"text-[13px] text-ink"}>
          {t("What should we remember?")}
        </label>
        <Textarea
          id="rationale"
          name="rationale"
          maxLength={2000}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={
            "min-h-30 w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:min-h-22.5 lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
          }
        />
        <Feedback state={state} />
        <Button
          type="submit"
          disabled={pending}
          className={
            "secondary bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248] mt-2 lg:compact:mt-1"
          }
        >
          {pending ? t("Saving review…") : t("Mark stage reviewed")}
        </Button>
      </form>
    </details>
  );
}
