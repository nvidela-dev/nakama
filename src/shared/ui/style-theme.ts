import type { CSSProperties } from "react";

export const styleThemes = ["day", "night"] as const;
export type StyleTheme = (typeof styleThemes)[number];
export const defaultStyleTheme: StyleTheme = "day";
export function parseStyleTheme(value: unknown): StyleTheme {
  // Retain the light/dark intent of saved preferences from the earlier visual system.
  if (value === "zen") return "day";
  if (value === "hacker") return "night";
  return styleThemes.find((theme) => theme === value) ?? defaultStyleTheme;
}
export const palettes = {
  day: {
    ink: "#141414",
    muted: "#595959",
    bg: "#f5f5f5",
    panel: "#ffffff",
    line: "#d9d9d9",
    lime: "#0958d9",
    dark: "#ffffff",
    pink: "#a8071a",
  },
  night: {
    ink: "#fafafa",
    muted: "#bfbfbf",
    bg: "#141414",
    panel: "#1f1f1f",
    line: "#424242",
    lime: "#69b1ff",
    dark: "#141414",
    pink: "#ff7875",
  },
} as const;
const surfaces = {
  day: {
    control: "#8c8c8c",
    soft: "#e6f4ff",
    hover: "#141414",
    warning: "#fffbe6",
    danger: "#fff1f0",
    dangerInk: "#a8071a",
  },
  night: {
    control: "#595959",
    soft: "#112545",
    hover: "#91caff",
    warning: "#2b2111",
    danger: "#2a1215",
    dangerInk: "#ff7875",
  },
};
export type ThemeStyle = CSSProperties & Partial<Record<`--${string}`, string>>;
export function styleThemeProperties(theme: StyleTheme): ThemeStyle {
  const palette = palettes[theme],
    surface = surfaces[theme];
  return {
    ...Object.fromEntries(
      Object.entries(palette).flatMap(([name, value]) => [
        [`--${name}`, value],
        [`--color-${name}`, value],
      ]),
    ),
    "--theme-text": palette.ink,
    "--theme-on-accent": palette.dark,
    "--theme-border": surface.control,
    "--theme-illustration-shadow": surface.control,
    "--theme-surface": surface.soft,
    "--theme-surface-low": palette.panel,
    "--theme-selected": surface.soft,
    "--theme-chat": palette.panel,
    "--theme-chat-own": surface.soft,
    "--theme-accent-hover": surface.hover,
    "--theme-warning": surface.warning,
    "--theme-danger": surface.danger,
    "--theme-danger-ink": surface.dangerInk,
    "--theme-overlay": surface.soft,
    "--theme-glow": surface.soft,
    "--theme-map": palette.bg,
    "--color-solar": "#91caff",
    "--color-on-solar": "#141414",
    colorScheme: theme === "day" ? "light" : "dark",
  };
}
/** Storybook and the app use the same semantic palette. */
export function applyStyleTheme(theme: StyleTheme, root: HTMLElement): void {
  for (const [name, value] of Object.entries(styleThemeProperties(theme))) {
    if (name.startsWith("--")) root.style.setProperty(name, String(value));
  }
  root.style.colorScheme = theme === "day" ? "light" : "dark";
  root.dataset.theme = theme;
}
