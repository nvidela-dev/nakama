import { Panel } from "@/shared/ui/panel";
import { requestPolicy } from "@/features/access/server/request-store";
import { AccessRequestList } from "@/features/access/components/access-request-list";
import { adminActor } from "@/features/access/server/auth";
import { accessPolicy } from "@/features/access/server/whitelist";
import { getT } from "@/shared/i18n/server";
import { WhitelistList } from "@/features/access/components/whitelist-list";
import { AddAllowedEmail } from "@/features/access/components/whitelist";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const person = await adminActor();
  const [entries, requests] = await Promise.all([
    accessPolicy().list(person),
    requestPolicy().list(person),
  ]);
  const t = await getT();
  return (
    <main id="main" className="workspace">
      <div className="page-heading">
        <h1>{t("Administration")}</h1>
        <p>{t("Only whitelisted emails can sign up and access private workspaces.")}</p>
      </div>
      <div className="workspace-columns">
        <Panel className="">
          <h2>{t("Allowed emails")}</h2>
          <p className="muted">
            {t(
              "Removing access blocks future private requests. It does not delete the account or project history.",
            )}
          </p>
          <WhitelistList entries={entries} />
          <AccessRequestList requests={requests} />
        </Panel>
        <aside className="panel">
          <h2>{t("Allow a person")}</h2>
          <p>
            {t(
              "Add one exact email address. This grants app access; projects still require membership. No email notification is sent.",
            )}
          </p>
          <AddAllowedEmail />
        </aside>
      </div>
    </main>
  );
}
