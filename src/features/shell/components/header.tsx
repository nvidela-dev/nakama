import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { ThemeSwitcher } from "@/features/preferences/components/theme-switcher";
import { LanguageSwitcher } from "@/features/preferences/components/language-switcher";
import { WaveMark } from "@/shared/ui/wave-mark";
import { Suspense } from "react";
import { getLocale, getT } from "@/shared/i18n/server";
import type { StyleTheme } from "@/shared/ui/style-theme";
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

export async function Header({ theme }: { theme: StyleTheme }) {
  const [t, owner] = await Promise.all([getT(), currentIsAdmin()]);
  return (
    <header className="site-header relative z-40 grid min-h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-line bg-panel px-2 py-1 min-[600px]:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-4 lg:px-6 [&_.notification-list_a]:block [&_.notification-list_a]:wrap-anywhere">
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
          <span>nakama</span>
        </Link>
      </div>
      <div
        aria-label={t("Workspace preferences")}
        role="group"
        className="col-span-2 row-start-2 flex min-h-11 min-w-0 items-center justify-end gap-1 border-t border-line min-[600px]:col-span-1 min-[600px]:col-start-2 min-[600px]:row-start-1 min-[600px]:border-0"
      >
        {owner && (
          <Show when="signed-in">
            <Link
              href="/admin"
              aria-label={t("Administration")}
              title={t("Administration")}
              className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-[var(--theme-selected)] hover:text-ink focus-visible:outline-2 focus-visible:outline-lime"
            >
              <Icon name="admin" />
            </Link>
          </Show>
        )}
        <ThemeSwitcher theme={theme} />
        <LanguageSwitcher />
      </div>
      {authConfigured() && (
        <div className="col-start-2 row-start-1 flex min-h-11 shrink-0 items-center justify-end gap-0.5 text-xs min-[600px]:col-start-3 sm:gap-2">
          <Show when="signed-in">
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
          </Show>
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <Button type="button" variant="ghost" className="nav-button min-h-11">
                {t("Sign in")}
              </Button>
            </SignInButton>
          </Show>
        </div>
      )}
    </header>
  );
}
