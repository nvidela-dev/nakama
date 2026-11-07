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

  const inviteHint = t(
    "They'll need this verified email to join. Links expire after 7 days. A new invitation replaces their previous unused link.",
  );

  return (
    <form
      action={action}
      className={
        "form-stack flex flex-col gap-1.5 pt-2 border-t border-t-line min-w-0 max-w-full [&_textarea]:w-full lg:compact:gap-1.5"
      }
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <label htmlFor="email" className={"text-[11px] text-muted leading-[1.4]"}>
          {t("Approved person")}
        </label>
        <span className="group relative inline-flex items-center shrink-0">
          <span
            tabIndex={0}
            role="note"
            aria-label={inviteHint}
            title={inviteHint}
            className="inline-grid place-items-center w-4 h-4 rounded-full border border-line text-[11px] leading-none text-muted cursor-help select-none hover:border-lime hover:text-lime focus-visible:outline-2 focus-visible:outline-lime"
          >
            ?
          </span>
          <span
            role="tooltip"
            className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity duration-150 absolute right-0 bottom-full mb-1.5 w-52 p-2 rounded-[6px] bg-bg border border-line text-[11px] leading-[1.4] text-ink shadow-lg z-20 break-words"
          >
            {inviteHint}
          </span>
        </span>
      </div>
      <Select
        id="email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        disabled={pending || !candidates.length}
        className={
          "w-full min-w-0 max-w-full overflow-hidden text-ellipsis focus-visible:[outline-offset:4px]"
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
        <p className={"muted m-0 text-muted text-[11px]"}>
          {t("No approved people available to invite.")}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending || !email || !candidates.includes(email)}
        className={"secondary mt-1"}
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
            className={"w-full [resize:vertical] mt-2"}
          />
          <Button
            type="button"
            variant="ghost"
            className={
              "min-h-11 hover:[background:var(--theme-overlay,#ffffff0a)] mt-2 lg:compact:mt-1"
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
        "form-stack flex flex-col gap-3 [&_label]:text-[13px] [&_label]:text-ink [&_textarea]:w-full [&_small]:text-[11px] [&_small]:text-muted [&_select]:max-w-full lg:compact:gap-1.75"
      }
    >
      <Input type="hidden" name="token" value={token} className={"w-full [resize:vertical]"} />
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
