"use client";
import { useActionState } from "react";
import { manageWhitelist } from "@/app/admin/actions";
import { useT } from "./language";
import { Feedback } from "./forms";

export function AddAllowedEmail() {
  const t = useT();
  const [state, action, pending] = useActionState(manageWhitelist, {});
  return <form action={action} className="form-stack">
    <input type="hidden" name="operation" value="add" />
    <label htmlFor="allowed-email">{t("Email address")}</label>
    <input id="allowed-email" name="email" type="email" required maxLength={254} autoComplete="off" />
    <button disabled={pending}>{pending ? t("Saving…") : t("Allow email")}</button>
    <Feedback state={state} />
  </form>;
}
export function RemoveAllowedEmail({ id }: { id: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(manageWhitelist, {});
  return <form action={action}>
    <input type="hidden" name="operation" value="remove" />
    <input type="hidden" name="id" value={id} />
    <button className="button secondary" disabled={pending}>{pending ? t("Saving…") : t("Remove access")}</button>
    <Feedback state={state} />
  </form>;
}
