"use client";
import { useActionState, useState } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { requestAccess } from "@/app/access-required/actions";
import { useT } from "./language";
export function AccessEntry({ signup = false }: { signup?: boolean }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState(requestAccess, {});
  if (state.permittedEmail) return signup
    ? <SignUp initialValues={{ emailAddress: state.permittedEmail }} />
    : <Link className="button" href="/projects">{t("Open projects")}</Link>;
  return <section className="panel access-entry">
    <h2>{t(signup ? "Sign up" : "Request access")}</h2>
    <p>{t("Enter your email. If it is not allowed yet, a request will be saved for the administrator to review.")}</p>
    <form className="form-stack" action={action}>
      <label htmlFor="request-email">{t("Email address")}</label>
      <input type="email" name="email" id="request-email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" />
      <button disabled={pending}>{pending ? t("Saving…") : t("Continue")}</button>
      {state.error && <p className="message error" role="alert">{t(state.error)}</p>}
      {state.requested && <p className="message" role="status">{t("Access requested. You can sign up after the administrator allows your email.")}</p>}
    </form>
  </section>;
}
