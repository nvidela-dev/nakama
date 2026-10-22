import { cookies } from "next/headers";
import { DensitySwitcher } from "./density";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitcher } from "./language";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
export async function Header() {
  const t = await getT();
  const density =
    (await cookies()).get("nakama-density")?.value === "comfortable"
      ? "comfortable"
      : "compact";
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label={t("Nakama home")}>
        <span className="brand-mark" aria-hidden="true">
          ✳
        </span>{" "}
        nakama<span className="brand-dot">.</span>
      </Link>
      <nav aria-label={t("Main navigation")}>
        <Link href="/">{t("The harbor")}</Link>
        <Link href="/preview">{t("A sample path")}</Link>
        <DensitySwitcher density={density} />
        <LanguageSwitcher />
        {authConfigured() && (
          <>
            <Show when="signed-in">
              <Link href="/projects">{t("Your projects")}</Link>
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button className="nav-button">{t("Come aboard ↗")}</button>
              </SignInButton>
            </Show>
          </>
        )}
      </nav>
    </header>
  );
}
