"use client";

import { Button } from "@/shared/ui/button";

import type { ActionState } from "@/shared/contracts/action-state";
import { Feedback } from "@/shared/ui/feedback";
import { useT } from "@/shared/i18n/provider";

import { useActionState } from "react";
import { managePerson } from "@/features/collaboration/invitation-actions";
const initial: ActionState = {};
export function AccessButton({
  projectId,
  id,
  operation,
}: {
  projectId: string;
  id: string;
  operation: "revoke" | "remove";
}) {
  const t = useT();
  const [state, action, pending] = useActionState(managePerson.bind(null, projectId), initial);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="operation" value={operation} />
      <Button
        type="submit"
        variant="ghost"
        className={"min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)]"}
        disabled={pending}
      >
        {pending
          ? t("Updating…")
          : operation === "revoke"
            ? t("Revoke invitation")
            : t("Remove member")}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
