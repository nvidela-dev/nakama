import { ThemeSwitcher } from "@/features/preferences/components/theme-switcher";
import type { StyleTheme } from "@/shared/ui/style-theme";
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

export async function Footer({
  density,
  theme,
}: {
  density: "compact" | "comfortable";
  theme: StyleTheme;
}) {
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
    <footer className="bg-panel border-t border-line px-3 py-1 flex items-center justify-between gap-2 z-30 text-xs">
      <span className="hidden sm:inline">{t("Nakama")}</span>
      <div className="footer-preferences flex flex-wrap items-center justify-end gap-1.5">
        {admin && (
          <Show when="signed-in">
            <Link
              className={
                "footer-admin-link inline-flex items-center min-h-7.5 text-[11px] text-muted hover:text-lime focus-visible:[outline:2px_solid_var(--color-lime)] focus-visible:[outline-offset:3px]"
              }
              href="/admin"
            >
              {t("Administration")}
            </Link>
          </Show>
        )}
        <ThemeSwitcher theme={theme} />
        <LanguageSwitcher />
        <DensitySwitcher density={density} />
      </div>
    </footer>
  );
}
