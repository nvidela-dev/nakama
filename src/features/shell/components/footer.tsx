import {
  callClerk,
  clerkResponse,
  currentIdentityWithId,
} from "@/server/observability/provider-diagnostics";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Show } from "@clerk/nextjs";
import { authConfigured } from "@/features/access/server/auth";
import { isAppAdmin } from "@/features/access/server/app-access";
import { adminEmail } from "@/features/access/server/whitelist";
import { getT } from "@/shared/i18n/server";
import { DensitySwitcher } from "@/features/preferences/components/density";
import { LanguageSwitcher } from "@/features/preferences/components/language-switcher";

export async function Footer({ density }: { density: "compact" | "comfortable" }) {
  const t = await getT();
  const user = authConfigured()
    ? clerkResponse(
        "user.current",
        currentIdentityWithId,
        await callClerk("user.current", () => currentUser()),
      )
    : null;
  const admin =
    !!user &&
    isAppAdmin(
      {
        userId: user.id,
        verifiedEmails: user.emailAddresses
          .filter((email) => email.verification?.status === "verified")
          .map((email) => email.emailAddress),
      },
      adminEmail(),
    );
  return (
    <footer>
      <span>{t("Nakama")}</span>
      <div className="footer-preferences">
        {admin && (
          <Show when="signed-in">
            <Link className="footer-admin-link" href="/admin">
              {t("Administration")}
            </Link>
          </Show>
        )}
        <LanguageSwitcher />
        <DensitySwitcher density={density} />
      </div>
    </footer>
  );
}
