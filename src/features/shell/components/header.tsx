import { Button } from "@/shared/ui/button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { WaveMark } from "@/shared/ui/wave-mark";
import { getT } from "@/shared/i18n/server";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { authConfigured, currentIsAdmin } from "@/features/access/server/auth";
import { MobileSidebar } from "./workspace-sidebar";

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
          nakama
        </Link>
      </div>
      {authConfigured() && (
        <>
          <Show when="signed-in">
            <div className="flex shrink-0 items-center gap-0.5 text-xs lg:gap-4">
              <NotificationBell />
              <div className="grid size-11 place-items-center">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonTrigger: { minWidth: 44, minHeight: 44, justifyContent: "center" },
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
