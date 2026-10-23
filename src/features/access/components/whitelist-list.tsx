import type { AllowedEmail } from "@/features/access/model";
import { normalizeEmail } from "@/features/access/server/app-access";
import { adminEmail } from "@/features/access/server/whitelist";
import { getT } from "@/shared/i18n/server";
import { RemoveAllowedEmail } from "@/features/access/components/whitelist";

export async function WhitelistList({ entries }: { entries: AllowedEmail[] }) {
  const t = await getT();
  return (
    <ul className="people-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <strong className="allowed-email">{entry.identifier}</strong>
          {normalizeEmail(entry.identifier) === adminEmail() ? (
            <span>{t("Administrator")}</span>
          ) : (
            <RemoveAllowedEmail id={entry.id} />
          )}
        </li>
      ))}
    </ul>
  );
}
