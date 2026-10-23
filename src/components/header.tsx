import { ProjectNavigation } from "./project-navigation";
import { NotificationBell } from "./notification-bell";
import { WaveMark } from "@/components/wave-mark";
import { currentUser } from "@clerk/nextjs/server";
import { isAppAdmin } from "@/lib/app-access";
import { adminEmail } from "@/lib/whitelist";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
export async function Header() {
  const t = await getT();
  const user = authConfigured() ? await currentUser() : null;
  const admin = !!user && isAppAdmin({ userId: user.id, verifiedEmails: user.emailAddresses.filter((email) => email.verification?.status === "verified").map((email) => email.emailAddress) }, adminEmail());
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
        {authConfigured() && (
          <>
            <Show when="signed-in">
              <ProjectNavigation />
              {admin && <Link href="/admin">{t("Administration")}</Link>}
              <NotificationBell />
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
