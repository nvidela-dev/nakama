import { applyStyleTheme, type StyleTheme } from "../src/shared/ui/style-theme";
import type { Preview } from "@storybook/nextjs-vite";
import { useEffect, type ReactNode } from "react";
import { messages } from "../src/shared/i18n/index";
import { LanguageProvider } from "../src/shared/i18n/provider";
import "../src/app/globals.css";
function StorySurface({
  children,
  locale,
  density,
  theme,
}: {
  children: ReactNode;
  locale: "en" | "es";
  density: "compact" | "comfortable";
  theme: StyleTheme;
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.density = density;
    applyStyleTheme(theme, document.documentElement);
  }, [locale, density, theme]);
  return (
    <LanguageProvider locale={locale} dictionary={locale === "es" ? messages : {}}>
      {children}
    </LanguageProvider>
  );
}
const preview: Preview = {
  tags: ["autodocs"],
  initialGlobals: { locale: "en", density: "compact", theme: "hacker" },
  globalTypes: {
    theme: {
      toolbar: {
        title: "Style",
        items: [
          { value: "hacker", title: "Hacker" },
          { value: "zen", title: "Zen" },
        ],
        dynamicTitle: true,
      },
    },
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
        theme={context.globals.theme === "zen" ? "zen" : "hacker"}
        locale={context.globals.locale === "es" ? "es" : "en"}
        density={context.globals.density === "comfortable" ? "comfortable" : "compact"}
      >
        <Story />
      </StorySurface>
    ),
  ],
};
export default preview;
