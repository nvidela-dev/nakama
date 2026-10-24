"use client";
import { Input, Select } from "@/shared/ui/controls";

import { Button } from "@/shared/ui/button";

import type { ActionState } from "@/shared/contracts/action-state";
import { Feedback } from "@/shared/ui/feedback";
import { useT } from "@/shared/i18n/provider";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  acceptInvitation,
  invitePerson,
  managePerson,
} from "@/features/collaboration/invitation-actions";
const initial: ActionState = {};
export function InviteForm({ projectId, candidates }: { projectId: string; candidates: string[] }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(async (previous: ActionState, data: FormData) => {
    const result = await invitePerson(projectId, previous, data);
    setLink(result.token ? `${window.location.origin}/invitations/accept#${result.token}` : "");
    setCopied(false);
    return result;
  }, initial);

  return (
    <form
      action={action}
      className={
        "form-stack flex flex-col gap-3 [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[var(--theme-border,#4b6056)] [&_textarea]:bg-bg [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px]"
      }
    >
      <label htmlFor="email" className={"text-[13px] text-ink"}>
        {t("Approved person")}
      </label>
      <Select
        id="email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        disabled={pending || !candidates.length}
        className={
          "bg-bg text-ink border border-[var(--theme-border,#4b6056)] rounded-[8px] p-3 [font:inherit] text-[13px] max-w-full lg:compact:py-2 lg:compact:px-2.5 focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:[outline-offset:4px]"
        }
      >
        <option value="">{t("Choose an approved person")}</option>
        {candidates.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate}
          </option>
        ))}
      </Select>
      {!candidates.length && (
        <p className={"muted mb-[1em] mt-0 text-muted text-[12px]"}>
          {t("No approved people available to invite.")}
        </p>
      )}
      <small className={"text-[11px] text-muted"}>
        {t(
          "They'll need this verified email to join. Links expire after 7 days. A new invitation replaces their previous unused link.",
        )}{" "}
      </small>
      <Button
        type="submit"
        disabled={pending || !email || !candidates.includes(email)}
        className={"secondary mt-2 lg:compact:mt-1"}
        variant="secondary"
      >
        {pending ? t("Preparing…") : t("Create invitation link")}
      </Button>
      <Feedback state={state} />
      {link && (
        <div className={"invite-result text-[12px] wrap-anywhere"}>
          <label htmlFor="invite-link" className={"text-[13px] text-ink"}>
            {t("Share this link privately")}
          </label>
          <Input
            id="invite-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className={
              "w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] mt-2 lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
            }
          />
          <Button
            type="button"
            className={
              "bg-transparent text-lime p-2 text-[11px] min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] mt-2 lg:compact:mt-1"
            }
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? t("Copied") : t("Copy invitation")}
          </Button>
        </div>
      )}
    </form>
  );
}
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
      <Input type="hidden" name="id" value={id} />
      <Input type="hidden" name="operation" value={operation} />
      <Button
        type="submit"
        className={
          "bg-transparent text-lime p-2 text-[11px] min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)]"
        }
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
export function AcceptForm() {
  const t = useT();
  const [state, action, pending] = useActionState(acceptInvitation, initial);
  const [token, setToken] = useState("");
  const initialized = useRef(false);
  useEffect(() => {
    // React development Strict Mode repeats effects. Read once before clearing the fragment.
    if (initialized.current) return;
    initialized.current = true;
    // The fragment is never sent in an HTTP URL or referrer. Remove it from browser history after reading.
    setToken(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return (
    <form
      action={action}
      className={
        "form-stack flex flex-col gap-3 [&_label]:text-[13px] [&_label]:text-ink [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[var(--theme-border,#4b6056)] [&_textarea]:bg-bg [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_small]:text-[11px] [&_small]:text-muted [&_select]:bg-bg [&_select]:text-ink [&_select]:border [&_select]:border-[var(--theme-border,#4b6056)] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:outline-3 [&_select:focus-visible]:outline-solid [&_select:focus-visible]:outline-lime [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5"
      }
    >
      <Input
        type="hidden"
        name="token"
        value={token}
        className={
          "w-full border border-[var(--theme-border,#4b6056)] bg-bg text-ink rounded-[8px] p-3 text-[14px] [resize:vertical] lg:compact:py-2 lg:compact:px-2.5 lg:compact:text-[13px]"
        }
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending || !token} className={"mt-2 lg:compact:mt-1"}>
        {pending ? t("Joining…") : t("Join this project")}
      </Button>
      {!token && (
        <p className={"mb-[1em] mt-0"}>{t("Open the original invitation link to join.")}</p>
      )}
    </form>
  );
}
