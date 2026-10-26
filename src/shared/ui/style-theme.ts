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
    ink: "#203a32",
    muted: "#53645a",
    bg: "#f3f4ea",
    panel: "#fcfcf6",
    line: "#d6dece",
    lime: "#294c3b",
    dark: "#fcfcf6",
    pink: "#a14435",
  },
  night: {
    ink: "#eaf0df",
    muted: "#b5c2af",
    bg: "#14241f",
    panel: "#1c3028",
    line: "#3e5548",
    lime: "#c5dca9",
    dark: "#17291f",
    pink: "#f1b4a8",
  },
} as const;
const surfaces = {
  day: {
    control: "#7a8a77",
    soft: "#e8eddf",
    hover: "#203a32",
    warning: "#f1eacc",
    danger: "#f7e8e0",
    dangerInk: "#a14435",
  },
  night: {
    control: "#7d9380",
    soft: "#263b31",
    hover: "#dded9e",
    warning: "#413b24",
    danger: "#492e29",
    dangerInk: "#f1b4a8",
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
    "--color-solar": "#dded9e",
    "--color-on-solar": "#203a32",
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
