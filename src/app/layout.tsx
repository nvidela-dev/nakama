import { cookies } from "next/headers";
import { getLocale, getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
import { Header } from "@/components/header";
import "./globals.css";
import { LanguageProvider } from "@/components/language";
import { enUS } from "@clerk/localizations/en-US";
import { esUY } from "@clerk/localizations/es-UY";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Nakama — a place for your what-ifs"),
    description: t(
      "Capture an idea. Find your people. Make a little something together.",
    ),
    referrer: "no-referrer",
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getT();
  const locale = await getLocale();
  const density =
    (await cookies()).get("nakama-density")?.value === "comfortable"
      ? "comfortable"
      : "compact";
  const content = (
    <>
      <a className="skip-link" href="#main">
        {t("Skip to content")}{" "}
      </a>
      <Header />
      {children}
      <footer>
        {t("Made for the things we haven't made yet.")}{" "}
        <span>{t("Small steps. Good company.")}</span>
      </footer>
    </>
  );
  return (
    <html lang={locale} data-density={density} data-scroll-behavior="smooth">
      <body>
        <LanguageProvider locale={locale}>
          {authConfigured() ? (
            <ClerkProvider localization={locale === "es" ? esUY : enUS}>
              {content}
            </ClerkProvider>
          ) : (
            content
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
