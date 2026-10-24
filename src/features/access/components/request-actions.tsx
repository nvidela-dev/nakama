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
      <div className={"request-actions flex gap-[6px] flex-wrap"}>
        <Button type="submit" name="operation" value="allow" disabled={pending}>
          {t("Allow email")}
        </Button>
        <Button
          type="submit"
          name="operation"
          value="dismiss"
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
          }
          disabled={pending}
        >
          {t("Dismiss")}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
