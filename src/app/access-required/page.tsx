import { Panel } from "@/shared/ui/panel";
import { AccessEntry } from "@/features/access/components/access-entry";
import { getT } from "@/shared/i18n/server";
export default async function AccessRequired() {
  const t = await getT();
  return (
    <main id="main" className="workspace">
      <Panel className="">
        <h1>{t("Access requires approval")}</h1>
        <p>
          {t(
            "Ask the administrator to whitelist your verified email address. Signing in or receiving a project invitation does not grant app access.",
          )}
        </p>
      </Panel>
      <AccessEntry />
    </main>
  );
}
