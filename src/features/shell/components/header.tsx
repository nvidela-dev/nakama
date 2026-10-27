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
    <header
      className={
        "site-header w-full max-w-none m-auto flex items-center justify-between border-b border-line bg-panel relative px-4 py-3 gap-4 flex-wrap lg:px-6 [&:has(.project-navigation-panel)]:z-[60] [&_.project-navigation-panel_a]:block [&_.project-navigation-panel_a]:min-h-11 [&_.project-navigation-panel_a]:p-3 [&_.project-navigation-panel_a]:wrap-anywhere [&:has(.notification-panel)]:z-[60] [&_.notification-list_a]:block [&_.notification-list_a]:wrap-anywhere"
      }
    >
      <Link
        href="/"
        className={
          "brand font-sans text-[29px] [font-weight:800] tracking-[-1px] flex items-center gap-2 max-[700px]:text-[24px] lg:compact:text-[23px]"
        }
        aria-label={t("Nakama home")}
      >
        <span
          className={
            "brand-mark text-lime text-[40px] leading-[1] max-[700px]:text-[32px] lg:compact:text-[30px]"
          }
          aria-hidden="true"
        >
          <WaveMark />
        </span>{" "}
        nakama
      </Link>
      <nav
        aria-label={t("Main navigation")}
        className={
          "flex items-center gap-7 text-[13px] max-[700px]:text-[12px] max-[1000px]:flex-wrap max-[1000px]:gap-3.5 max-[700px]:w-full max-[700px]:justify-between max-[700px]:gap-2.5 lg:compact:gap-4.5"
        }
      >
        <Link href="/" className={"max-[700px]:first:hidden"}>
          {t("Home")}
        </Link>
        <Link href="/preview" className={"max-[700px]:first:hidden"}>
          {t("Example project")}
        </Link>
        <Link href="/wiki/experiments">{t("Lab guide")}</Link>
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
                <Button
                  type="submit"
                  className={
                    "nav-button bg-transparent border border-[var(--theme-border,#5f7565)] text-ink text-[13px] min-h-10 py-2 px-3.75"
                  }
                >
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
