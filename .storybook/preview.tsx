import type { Preview } from "@storybook/nextjs-vite";
import { useEffect, type ReactNode } from "react";
import { messages } from "../src/shared/i18n/index";
import { LanguageProvider } from "../src/shared/i18n/provider";
import "../src/app/globals.css";
function StorySurface({
  children,
  locale,
  density,
}: {
  children: ReactNode;
  locale: "en" | "es";
  density: "compact" | "comfortable";
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.body.className = "m-0 bg-bg text-ink font-mono text-base leading-[1.6]";
    document.documentElement.dataset.density = density;
  }, [locale, density]);
  return (
    <LanguageProvider locale={locale} dictionary={locale === "es" ? messages : {}}>
      {children}
    </LanguageProvider>
  );
}
const preview: Preview = {
  tags: ["autodocs"],
  initialGlobals: { locale: "en", density: "compact" },
  globalTypes: {
    locale: {
      toolbar: {
        title: "Language",
        items: [
          { value: "en", title: "English" },
          { value: "es", title: "Español" },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      toolbar: { title: "Density", items: ["compact", "comfortable"], dynamicTitle: true },
    },
  },
  parameters: { layout: "padded", nextjs: { appDirectory: true }, a11y: { test: "error" } },
  decorators: [
    (Story, context) => (
      <StorySurface
        locale={context.globals.locale === "es" ? "es" : "en"}
        density={context.globals.density === "comfortable" ? "comfortable" : "compact"}
      >
        <Story />
      </StorySurface>
    ),
  ],
};
export default preview;
