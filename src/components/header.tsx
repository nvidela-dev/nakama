import { WaveMark } from "@/components/wave-mark";
import { currentUser } from "@clerk/nextjs/server";
import { isAppAdmin } from "@/lib/app-access";
import { adminEmail } from "@/lib/whitelist";
import { cookies } from "next/headers";
import { DensitySwitcher } from "./density";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitcher } from "./language";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
export async function Header() {
  const t = await getT();
  const user = authConfigured() ? await currentUser() : null;
  const admin = !!user && isAppAdmin({ userId: user.id, verifiedEmails: user.emailAddresses.filter((email) => email.verification?.status === "verified").map((email) => email.emailAddress) }, adminEmail());
  const density =
    (await cookies()).get("nakama-density")?.value === "comfortable"
      ? "comfortable"
      : "compact";
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label={t("Nakama home")}>
        <span className="brand-mark" aria-hidden="true">
          <WaveMark />
        </span>{" "}
        nakama<span className="brand-dot">.</span>
      </Link>
      <nav aria-label={t("Main navigation")}>
        <Link href="/">{t("Home")}</Link>
        <Link href="/preview">{t("Example project")}</Link>
        <DensitySwitcher density={density} />
        <LanguageSwitcher />
        {authConfigured() && (
          <>
            <Show when="signed-in">
              <Link href="/projects">{t("Your projects")}</Link>
              {admin && <Link href="/admin">{t("Administration")}</Link>}
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button className="nav-button">{t("Sign in")}</button>
              </SignInButton>
            </Show>
          </>
        )}
      </nav>
    </header>
  );
}
