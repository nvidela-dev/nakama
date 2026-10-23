"use client";
import { useT } from "@/components/language";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  acceptInvitation,
  invitePerson,
  managePerson,
  type ActionState,
} from "@/app/actions";
const initial: ActionState = {};
export function Feedback({ state }: { state: ActionState }) {
  const t = useT();
  return (
    <>
      {state.error && (
        <p className="message error" role="alert">
          {t(state.error)}
        </p>
      )}
      {state.success && (
        <p className="message" role="status">
          {t(state.success)}
        </p>
      )}
    </>
  );
}
export function InviteForm({ projectId, candidates }: { projectId: string; candidates: string[] }) {
  const t = useT();
  const [state, action, pending] = useActionState(
    invitePerson.bind(null, projectId),
    initial,
  );
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setLink(
      state.token
        ? `${window.location.origin}/invitations/accept#${state.token}`
        : "",
    );
    setCopied(false);
  }, [state.token]);
  return (
    <form action={action} className="form-stack">
      <label htmlFor="email">{t("Approved person")}</label>
      <select id="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={pending || !candidates.length}>
        <option value="">{t("Choose an approved person")}</option>
        {candidates.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}
      </select>
      {!candidates.length && <p className="muted">{t("No approved people available to invite.")}</p>}
      <small>
        {t(
          "They'll need this verified email to join. Links expire after 7 days. A new invitation replaces their previous unused link.",
        )}{" "}
      </small>
      <button disabled={pending || !email || !candidates.includes(email)} className="secondary">
        {pending ? t("Preparing…") : t("Create invitation link")}
      </button>
      <Feedback state={state} />
      {link && (
        <div className="invite-result">
          <label htmlFor="invite-link">{t("Share this link privately")}</label>
          <input
            id="invite-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
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
          </button>
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
  const [state, action, pending] = useActionState(
    managePerson.bind(null, projectId),
    initial,
  );
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="operation" value={operation} />
      <button className="text-button" disabled={pending}>
        {pending
          ? t("Updating…")
          : operation === "revoke"
            ? t("Revoke invitation")
            : t("Remove member")}
      </button>
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
      <input type="hidden" name="token" value={token} />
      <Feedback state={state} />
      <button disabled={pending || !token}>
        {pending ? t("Joining…") : t("Join this project")}
      </button>
      {!token && <p>{t("Open the original invitation link to join.")}</p>}
    </form>
  );
}
