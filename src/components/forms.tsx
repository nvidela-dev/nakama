"use client";
import { useActionState, useEffect, useState } from "react";
import {
  acceptInvitation,
  createProject,
  invitePerson,
  managePerson,
  type ActionState,
} from "@/app/actions";
const initial: ActionState = {};
export function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && (
        <p className="message error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="message" role="status">
          {state.success}
        </p>
      )}
    </>
  );
}
export function CaptureForm() {
  const [state, action, pending] = useActionState(createProject, initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form action={action} className="form-stack">
      <label htmlFor="name">Give your idea a name</label>
      <input
        id="name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
        placeholder="A tiny pirate radio play"
      />
      <label htmlFor="description">What are you imagining?</label>
      <textarea
        id="description"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        maxLength={2000}
        rows={4}
        placeholder="A few sentences is plenty. You can figure out the rest together."
      />
      <Feedback state={state} />
      <button disabled={pending}>
        {pending ? "Saving your idea…" : "Give it a place to grow ↗"}
      </button>
      <small>Private to you until you invite someone.</small>
    </form>
  );
}
export function InviteForm({ projectId }: { projectId: string }) {
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
      <label htmlFor="email">A friend's email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        maxLength={254}
        placeholder="friend@example.com"
      />
      <small>
        They'll need this verified email to join. Links expire after 7 days. A
        new invitation replaces their previous unused link.
      </small>
      <button disabled={pending} className="secondary">
        {pending ? "Preparing…" : "Create invitation link"}
      </button>
      <Feedback state={state} />
      {link && (
        <div className="invite-result">
          <label htmlFor="invite-link">Share this link privately</label>
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
            {copied ? "Copied" : "Copy invitation"}
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
          ? "Updating…"
          : operation === "revoke"
            ? "Revoke invitation"
            : "Remove member"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
export function AcceptForm() {
  const [state, action, pending] = useActionState(acceptInvitation, initial);
  const [token, setToken] = useState("");
  useEffect(() => {
    // The fragment is never sent in an HTTP URL or referrer. Remove it from browser history after reading.
    setToken(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="token" value={token} />
      <Feedback state={state} />
      <button disabled={pending || !token}>
        {pending ? "Joining…" : "Join this project"}
      </button>
      {!token && <p>Open the original invitation link to join.</p>}
    </form>
  );
}
