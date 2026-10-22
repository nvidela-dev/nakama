import type { AllowedEmail } from "@/lib/app-access";
import { normalizeEmail } from "@/lib/app-access";
import { adminEmail } from "@/lib/whitelist";
import { getT } from "@/lib/i18n/server";
import { RemoveAllowedEmail } from "./whitelist";

export async function WhitelistList({ entries }: { entries: AllowedEmail[] }) {
  const t = await getT();
  return <ul className="people-list">{entries.map((entry) => <li key={entry.id}>
    <strong className="allowed-email">{entry.identifier}</strong>
    {normalizeEmail(entry.identifier) === adminEmail() ? <span>{t("Administrator")}</span> : <RemoveAllowedEmail id={entry.id} />}
  </li>)}</ul>;
}
