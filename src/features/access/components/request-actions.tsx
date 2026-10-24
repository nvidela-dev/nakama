"use client";
import { Input } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState } from "react";
import { manageAccessRequest } from "@/features/access/admin-actions";
import { useT } from "@/shared/i18n/provider";
import { Feedback } from "@/shared/ui/feedback";
export function RequestActions({ id }: { id: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(manageAccessRequest, {});
  return (
    <form action={action}>
      <Input type="hidden" name="id" value={id} />
      <div className={"request-actions flex gap-1.5 flex-wrap"}>
        <Button type="submit" name="operation" value="allow" disabled={pending}>
          {t("Allow email")}
        </Button>
        <Button
          type="submit"
          name="operation"
          value="dismiss"
          className={"button secondary"}
          disabled={pending}
          variant="secondary"
        >
          {t("Dismiss")}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
