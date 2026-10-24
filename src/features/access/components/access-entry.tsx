"use client";
import { Panel } from "@/shared/ui/panel";

import { Input } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import { useActionState, useState } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { requestAccess } from "@/features/access/actions";
import { useT } from "@/shared/i18n/provider";
export function AccessEntry({ signup = false }: { signup?: boolean }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState(requestAccess, {});
  if (state.permittedEmail)
    return signup ? (
      <SignUp initialValues={{ emailAddress: state.permittedEmail }} />
    ) : (
      <Link
        className={
          "button border-0 rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 bg-lime text-dark font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[background:#e9ffc1] hover:[transform:translateY(-1px)]"
        }
        href="/projects"
      >
        {t("Open projects")}
      </Link>
    );
  return (
    <Panel className={"access-entry w-[min(100%,_480px)] my-5 mx-auto"}>
      <h2
        className={
          "mb-[0.83em] mt-0 font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
        }
      >
        {t(signup ? "Sign up" : "Request access")}
      </h2>
      <p className={"mb-[1em] mt-[0]"}>
        {t(
          "Enter your email. If it is not allowed yet, a request will be saved for the administrator to review.",
        )}
      </p>
      <form
        className={
          "form-stack flex flex-col gap-3 [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[#4b6056] [&_textarea]:bg-[#101c1b] [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_small]:text-[11px] [&_small]:text-muted [&_select]:bg-[#101c1b] [&_select]:text-ink [&_select]:border [&_select]:border-[#4b6056] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:[outline:3px_solid_var(--color-lime)] [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
        }
        action={action}
      >
        <label htmlFor="request-email" className={"text-[13px] text-ink"}>
          {t("Email address")}
        </label>
        <Input
          type="email"
          name="email"
          id="request-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={254}
          autoComplete="email"
          className={
            "w-full border border-[#4b6056] bg-[#101c1b] text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
          }
        />
        <Button type="submit" disabled={pending} className={"mt-2 lg:compact:mt-1"}>
          {pending ? t("Saving…") : t("Continue")}
        </Button>
        {state.error && (
          <p
            className={
              "message error text-[13px]! rounded-[8px] p-3 text-ink! m-0 bg-[#4e3030] [color:#ffe4dd]!"
            }
            role="alert"
          >
            {t(state.error)}
          </p>
        )}
        {state.requested && (
          <p
            className={
              "message text-[13px]! bg-[#30422d] rounded-[8px] p-3 text-ink! m-0 [&.error]:bg-[#4e3030] [&.error]:[color:#ffe4dd]!"
            }
            role="status"
          >
            {t("Access requested. You can sign up after the administrator allows your email.")}
          </p>
        )}
      </form>
    </Panel>
  );
}
