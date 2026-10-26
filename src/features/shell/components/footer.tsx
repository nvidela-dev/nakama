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
    <footer
      className={
        "max-w-360 m-auto py-7 px-[6%] border-t border-t-[var(--theme-overlay,#ffffff0c)] flex justify-between text-[11px] [color:var(--theme-text,#8a9c92)] items-center gap-4 max-[700px]:gap-5 max-[700px]:text-[11px]"
      }
    >
      <span>{t("Nakama")}</span>
      <div
        className={
          "footer-preferences flex items-center justify-end flex-wrap gap-2.5 ml-auto [&_.language-switch]:h-7.5 [&_.language-switch]:p-0.5 [&_.language-switch]:gap-0.5 [&_.language-switch_button]:h-6 [&_.language-switch_button]:min-h-6 [&_.language-switch_button]:py-0.5 [&_.language-switch_button]:px-2 [&_.language-switch_button]:text-[11px] [&_.language-switch_button]:leading-[1] [&_.density-control_select]:h-7.5 [&_.density-control_select]:min-h-7.5 [&_.density-control_select]:py-1 [&_.density-control_select]:px-2 [&_.density-control_select]:text-[11px]"
        }
      >
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
        <Link
          href="/wiki"
          className="inline-flex items-center min-h-7.5 text-[11px] text-muted hover:text-lime"
        >
          {t("Wiki")}
        </Link>
        <ThemeSwitcher theme={theme} />
        <LanguageSwitcher />
        <DensitySwitcher density={density} />
      </div>
    </footer>
  );
}
