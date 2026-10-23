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
    <form action={action} className="form-stack">
      <label htmlFor="email">{t("Approved person")}</label>
      <Select
        id="email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        disabled={pending || !candidates.length}
      >
        <option value="">{t("Choose an approved person")}</option>
        {candidates.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate}
          </option>
        ))}
      </Select>
      {!candidates.length && (
        <p className="muted">{t("No approved people available to invite.")}</p>
      )}
      <small>
        {t(
          "They'll need this verified email to join. Links expire after 7 days. A new invitation replaces their previous unused link.",
        )}{" "}
      </small>
      <Button
        type="submit"
        disabled={pending || !email || !candidates.includes(email)}
        className="secondary"
      >
        {pending ? t("Preparing…") : t("Create invitation link")}
      </Button>
      <Feedback state={state} />
      {link && (
        <div className="invite-result">
          <label htmlFor="invite-link">{t("Share this link privately")}</label>
          <Input id="invite-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <Button
            type="button"
            className="text-button"
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
      <Button type="submit" className="text-button" disabled={pending}>
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
    <form action={action} className="form-stack">
      <Input type="hidden" name="token" value={token} />
      <Feedback state={state} />
      <Button type="submit" disabled={pending || !token}>
        {pending ? t("Joining…") : t("Join this project")}
      </Button>
      {!token && <p>{t("Open the original invitation link to join.")}</p>}
    </form>
  );
}
