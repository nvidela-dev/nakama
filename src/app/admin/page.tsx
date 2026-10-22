import { adminActor } from "@/lib/auth";
import { accessPolicy, adminEmail } from "@/lib/whitelist";
import { getT } from "@/lib/i18n/server";
import { normalizeEmail } from "@/lib/app-access";
import { AddAllowedEmail, RemoveAllowedEmail } from "@/components/whitelist";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const person = await adminActor();
  const entries = await accessPolicy().list(person);
  const t = await getT();
  return <main id="main" className="workspace">
    <div className="page-heading"><h1>{t("Administration")}</h1><p>{t("Only whitelisted emails can sign up and access private workspaces.")}</p></div>
    <div className="workspace-columns">
      <section className="panel">
        <h2>{t("Allowed emails")}</h2>
        <p className="muted">{t("Removing access blocks future private requests. It does not delete the account or project history.")}</p>
        <ul className="people-list">{entries.map((entry) => <li key={entry.id}>
          <strong className="allowed-email">{entry.identifier}</strong>
          {normalizeEmail(entry.identifier) === adminEmail() ? <span>{t("Administrator")}</span> : <RemoveAllowedEmail id={entry.id} />}
        </li>)}</ul>
      </section>
      <aside className="panel"><h2>{t("Allow a person")}</h2><p>{t("Add one exact email address. This grants app access; projects still require membership. No email notification is sent.")}</p><AddAllowedEmail /></aside>
    </div>
  </main>;
}
