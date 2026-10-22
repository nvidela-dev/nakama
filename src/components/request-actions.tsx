"use client";
import { useActionState } from "react";
import { manageAccessRequest } from "@/app/admin/actions";
import { useT } from "./language";
import { Feedback } from "./forms";
export function RequestActions({ id }: { id: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(manageAccessRequest, {});
  return <form action={action}>
    <input type="hidden" name="id" value={id} />
    <div className="request-actions">
      <button name="operation" value="allow" disabled={pending}>{t("Allow email")}</button>
      <button name="operation" value="dismiss" className="button secondary" disabled={pending}>{t("Dismiss")}</button>
    </div>
    <Feedback state={state} />
  </form>;
}
