"use client";
import { Input } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState } from "react";
import { manageWhitelist } from "@/features/access/admin-actions";
import { useT } from "@/shared/i18n/provider";
import { Feedback } from "@/shared/ui/feedback";

export function AddAllowedEmail() {
  const t = useT();
  const [state, action, pending] = useActionState(manageWhitelist, {});
  return (
    <form
      action={action}
      className={
        "form-stack flex flex-col gap-3 [&_textarea]:w-full [&_small]:text-[11px] [&_small]:text-muted [&_select]:max-w-full lg:compact:gap-1.75"
      }
    >
      <Input type="hidden" name="operation" value="add" className={"w-full [resize:vertical]"} />
      <label htmlFor="allowed-email" className={"text-[13px] text-ink"}>
        {t("Email address")}
      </label>
      <Input
        id="allowed-email"
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="off"
        className={"w-full [resize:vertical]"}
      />
      <Button type="submit" disabled={pending} className={"mt-2 lg:compact:mt-1"}>
        {pending ? t("Saving…") : t("Allow email")}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
export function RemoveAllowedEmail({ id }: { id: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(manageWhitelist, {});
  return (
    <form action={action}>
      <Input type="hidden" name="operation" value="remove" />
      <Input type="hidden" name="id" value={id} />
      <Button type="submit" className={"button secondary"} disabled={pending} variant="secondary">
        {pending ? t("Saving…") : t("Remove access")}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
