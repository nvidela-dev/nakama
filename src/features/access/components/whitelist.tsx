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
        "form-stack flex flex-col gap-3 [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[#4b6056] [&_textarea]:bg-[#101c1b] [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_small]:text-[11px] [&_small]:text-muted [&_select]:bg-[#101c1b] [&_select]:text-ink [&_select]:border [&_select]:border-[#4b6056] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:[outline:3px_solid_var(--color-lime)] [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
      }
    >
      <Input
        type="hidden"
        name="operation"
        value="add"
        className={
          "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
        }
      />
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
        className={
          "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
        }
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
      <Button
        type="submit"
        className={
          "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[#344c39] text-lime border border-[#658451] hover:[background:#456248]"
        }
        disabled={pending}
      >
        {pending ? t("Saving…") : t("Remove access")}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
