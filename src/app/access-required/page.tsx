import { AccessEntry } from "@/components/access-entry";
import { getT } from "@/lib/i18n/server";
export default async function AccessRequired() {
  const t = await getT();
  return <main id="main" className="workspace"><section className="panel">
    <h1>{t("Access requires approval")}</h1>
    <p>{t("Ask the administrator to whitelist your verified email address. Signing in or receiving a project invitation does not grant app access.")}</p>
  </section><AccessEntry /></main>;
}
