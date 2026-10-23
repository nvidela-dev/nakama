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
    <form action={action} className="form-stack">
      <Input type="hidden" name="operation" value="add" />
      <label htmlFor="allowed-email">{t("Email address")}</label>
      <Input
        id="allowed-email"
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="off"
      />
      <Button type="submit" disabled={pending}>
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
      <Button type="submit" className="button secondary" disabled={pending}>
        {pending ? t("Saving…") : t("Remove access")}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
