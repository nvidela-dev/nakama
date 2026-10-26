import { palettes, parseStyleTheme, styleThemeProperties } from "@/shared/ui/style-theme";
import { cookies } from "next/headers";
import { messages } from "@/shared/i18n/index";
import { getLocale, getT } from "@/shared/i18n/server";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { authConfigured } from "@/features/access/server/auth";
import { Header } from "@/features/shell/components/header";
import "./globals.css";
import { Footer } from "@/features/shell/components/footer";
import { LanguageProvider } from "@/shared/i18n/provider";
import { enUS } from "@clerk/localizations/en-US";
import { esUY } from "@clerk/localizations/es-UY";
export async function generateViewport(): Promise<Viewport> {
  const theme = parseStyleTheme((await cookies()).get("nakama-theme")?.value);
  return { themeColor: palettes[theme].bg, colorScheme: theme === "zen" ? "light" : "dark" };
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
  const t = await getT();
  const locale = await getLocale();
  const theme = parseStyleTheme((await cookies()).get("nakama-theme")?.value);
  const density =
    (await cookies()).get("nakama-density")?.value === "comfortable" ? "comfortable" : "compact";
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
      <Header />
      {children}
      <Footer density={density} theme={theme} />
    </>
  );
  return (
    <html
      style={styleThemeProperties(theme)}
      data-theme={theme}
      lang={locale}
      data-density={density}
      data-scroll-behavior="smooth"
      className={
        'lg:[html&[data-density="compact"]_footer]:max-w-360 lg:[html&[data-density="compact"]_footer]:py-4 lg:[html&[data-density="compact"]_footer]:px-7'
      }
    >
      <body className={"m-0 bg-bg text-ink font-mono text-[16px] leading-[1.6]"}>
        <LanguageProvider locale={locale} dictionary={locale === "es" ? messages : {}}>
          {authConfigured() ? (
            <ClerkProvider localization={locale === "es" ? esUY : enUS}>{content}</ClerkProvider>
          ) : (
            content
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
