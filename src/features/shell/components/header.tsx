import { Button } from "@/shared/ui/button";
import { ProjectNavigation } from "@/features/projects/components/project-navigation";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { WaveMark } from "@/shared/ui/wave-mark";
import { getT } from "@/shared/i18n/server";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { authConfigured } from "@/features/access/server/auth";
export async function Header() {
  const t = await getT();
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
              <Link href="/artifacts">{t("Artifacts")}</Link>
              <NotificationBell />
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <Button type="submit" className="nav-button">
                  {t("Sign in")}
                </Button>
              </SignInButton>
            </Show>
          </>
        )}
      </nav>
    </header>
  );
}
