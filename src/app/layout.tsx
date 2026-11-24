import { AntdRegistry } from "@ant-design/nextjs-registry";
import { DesignProvider } from "@/shared/ui/design-provider";
import { palettes, parseStyleTheme, styleThemeProperties } from "@/shared/ui/style-theme";
import { cookies } from "next/headers";
import { messages } from "@/shared/i18n/index";
import { getLocale, getT } from "@/shared/i18n/server";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { authConfigured, currentIsAdmin } from "@/features/access/server/auth";
import { Header } from "@/features/shell/components/header";

import "./globals.css";
import { Show } from "@clerk/nextjs";
import { DesktopSidebar } from "@/features/shell/components/workspace-sidebar";
import { LanguageProvider } from "@/shared/i18n/provider";
import { enUS } from "@clerk/localizations/en-US";
import { esUY } from "@clerk/localizations/es-UY";
export async function generateViewport(): Promise<Viewport> {
  const theme = parseStyleTheme((await cookies()).get("nakama-theme")?.value);
  return { themeColor: palettes[theme].bg, colorScheme: theme === "day" ? "light" : "dark" };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = t("Nakama — Projects");
  const description = t("Define, develop, and manage projects with your team.");
  return {
    title: { default: title, template: "%s | Nakama" },
    description,
    applicationName: "Nakama",
    appleWebApp: { capable: true, title: "Nakama", statusBarStyle: "default" },
    formatDetection: { telephone: false },
    openGraph: { title, description, siteName: "Nakama", type: "website" },
    twitter: { card: "summary", title, description },
    referrer: "no-referrer",
  };
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [t, owner] = await Promise.all([getT(), currentIsAdmin()]);
  const locale = await getLocale();
  const theme = parseStyleTheme((await cookies()).get("nakama-theme")?.value);
  const content = (
    <>
      <a
        className={
          "skip-link text-inherit no-underline focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 absolute top-[-100px] left-5 z-[100] bg-lime text-dark p-3 focus:top-3"
        }
        href="#main"
      >
        {t("Skip to content")}{" "}
      </a>
      <div className="fixed inset-0 grid grid-rows-[auto_minmax(0,1fr)]">
        <Header theme={theme} />
        <div className="flex min-h-0 min-w-0">
          {authConfigured() && (
            <Show when="signed-in">
              <div className="hidden w-51 shrink-0 lg:grid lg:grid-rows-[minmax(0,1fr)]">
                <DesktopSidebar owner={owner} />
              </div>
            </Show>
          )}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-bg" id="workspace-scroll">
            {children}
          </div>
        </div>
      </div>
    </>
  );
  return (
    <html
      style={styleThemeProperties(theme)}
      data-theme={theme}
      lang={locale}
      data-density="compact"
      data-scroll-behavior="smooth"
    >
      <body className={"m-0 bg-bg text-ink font-sans text-[14px] leading-[1.5]"}>
        <AntdRegistry>
          <DesignProvider mode={theme}>
            <LanguageProvider locale={locale} dictionary={locale === "es" ? messages : {}}>
              {authConfigured() ? (
                <ClerkProvider localization={locale === "es" ? esUY : enUS}>
                  {content}
                </ClerkProvider>
              ) : (
                content
              )}
            </LanguageProvider>
          </DesignProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
