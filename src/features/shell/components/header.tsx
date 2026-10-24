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
        'site-header max-w-360 py-7.5 px-[6%] m-auto flex items-center justify-between border-b border-b-[var(--theme-overlay,#ffffff0c)] relative isolate max-[700px]:py-5 max-[1000px]:flex-wrap max-[1000px]:gap-4.5 lg:compact:max-w-none lg:compact:py-3 lg:compact:px-7 lg:compact:gap-5 min-[2000px]:compact:px-10 before:[content:""] before:absolute before:inset-0 before:z-[-1] before:[pointer-events:none] before:[background-image:radial-gradient(circle_at_1px_1px,_#dcf6a35c_0.6px,_#dcf6a326_1px,_transparent_1.5px),_radial-gradient(ellipse_at_65%_0%,_var(--theme-glow,#dcf6a314),_transparent_70%)] before:[background-size:7px_7px,_100%_100%] before:[mask:url("/header-wave-mask.svg")_center_/_100%_100%_no-repeat] before:[-webkit-mask:url("/header-wave-mask.svg")_center_/_100%_100%_no-repeat] [&:has(.project-navigation-panel)]:z-[60] [&_.project-navigation-panel_a]:block [&_.project-navigation-panel_a]:min-h-11 [&_.project-navigation-panel_a]:py-2.5 [&_.project-navigation-panel_a]:px-3 [&_.project-navigation-panel_a]:wrap-anywhere [&_.project-navigation-panel_a]:[white-space:normal] [&_.project-navigation-panel_a]:rounded-[4px] max-[700px]:[&_.language-control]:absolute max-[700px]:[&_.language-control]:right-[6%] max-[700px]:[&_.language-control]:top-4 [&:has(.notification-panel)]:z-[60] [&_.notification-list_a]:block [&_.notification-list_a]:[white-space:normal] [&_.notification-list_a]:wrap-anywhere'
      }
    >
      <Link
        href="/"
        className={
          "brand font-mono text-[29px] [font-weight:800] tracking-[-1px] flex items-center gap-2 max-[700px]:text-[24px] lg:compact:text-[23px]"
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
        nakama<span className={"brand-dot text-lime ml-[-8px]"}>.</span>
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
