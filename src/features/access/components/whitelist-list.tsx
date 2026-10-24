import type { AllowedEmail } from "@/features/access/model";
import { normalizeEmail } from "@/features/access/server/app-access";
import { adminEmail } from "@/features/access/server/whitelist";
import { getT } from "@/shared/i18n/server";
import { RemoveAllowedEmail } from "@/features/access/components/whitelist";

export async function WhitelistList({ entries }: { entries: AllowedEmail[] }) {
  const t = await getT();
  return (
    <ul
      className={
        "people-list my-[1em] list-none mt-0 mx-0 mb-6 p-0 [&_small]:block [&_small]:text-[11px] [&_small]:text-muted lg:compact:mb-3.5"
      }
    >
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={
            "py-3.75 px-0 border-b border-b-line flex items-center justify-between gap-3 wrap-anywhere max-[700px]:flex-wrap lg:compact:py-2 lg:compact:gap-2 lg:compact:flex-wrap"
          }
        >
          <strong className={"allowed-email wrap-anywhere min-w-0 text-[13px]"}>
            {entry.identifier}
          </strong>
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
