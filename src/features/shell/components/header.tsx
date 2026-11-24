import { Button } from "@/shared/ui/button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { WaveMark } from "@/shared/ui/wave-mark";
import { Suspense } from "react";
import { getLocale, getT } from "@/shared/i18n/server";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { authConfigured, currentIsAdmin } from "@/features/access/server/auth";
import { loadWorkspaceMetrics } from "../server/home-activity";
import { HeaderIndicators } from "./header-indicators";
import { MobileSidebar } from "./workspace-sidebar";

async function WorkspaceIndicatorSlot() {
  const [metrics, locale] = await Promise.all([
    loadWorkspaceMetrics().catch(() => null),
    getLocale(),
  ]);
  return <HeaderIndicators metrics={metrics} locale={locale} />;
}

export async function Header() {
  const [t, owner] = await Promise.all([getT(), currentIsAdmin()]);
  return (
    <header className="site-header relative z-40 flex min-h-14 min-w-0 items-center justify-between gap-1 border-b border-line bg-panel px-2 py-1 sm:px-4 lg:px-6 [&_.notification-list_a]:block [&_.notification-list_a]:wrap-anywhere">
      <div className="flex min-w-0 items-center gap-1 lg:gap-3">
        {authConfigured() && (
          <Show when="signed-in">
            <MobileSidebar owner={owner} />
          </Show>
        )}
        <Link
          href="/"
          className="brand flex min-h-11 items-center gap-1 font-sans text-xl font-extrabold tracking-tight lg:gap-2 lg:text-2xl"
          aria-label={t("Nakama home")}
        >
          <span
            className="brand-mark text-2xl leading-none text-lime lg:text-3xl"
            aria-hidden="true"
          >
            <WaveMark />
          </span>
          <span className="max-[419px]:sr-only">nakama</span>
        </Link>
      </div>
      {authConfigured() && (
        <>
          <Show when="signed-in">
            <div className="flex min-h-11 shrink-0 items-center gap-0.5 text-xs sm:gap-2">
              <Suspense fallback={null}>
                <WorkspaceIndicatorSlot />
              </Suspense>
              <NotificationBell />
              <div className="grid size-11 place-items-center">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonBox: { display: "flex", alignItems: "center" },
                      userButtonTrigger: {
                        display: "flex",
                        alignItems: "center",
                        width: 44,
                        height: 44,
                        justifyContent: "center",
                        padding: 0,
                      },
                    },
                  }}
                />
              </div>
            </div>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <Button type="button" variant="ghost" className="nav-button min-h-11">
                {t("Sign in")}
              </Button>
            </SignInButton>
          </Show>
        </>
      )}
    </header>
  );
}
