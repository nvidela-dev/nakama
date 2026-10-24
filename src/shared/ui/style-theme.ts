import type { CSSProperties } from "react";

export const styleThemes = ["hacker", "zen"] as const;
export type StyleTheme = (typeof styleThemes)[number];
export const defaultStyleTheme: StyleTheme = "hacker";
export function parseStyleTheme(value: unknown): StyleTheme {
  return styleThemes.find((theme) => theme === value) ?? defaultStyleTheme;
}
type Palette = Record<"ink" | "muted" | "bg" | "panel" | "line" | "lime" | "dark" | "pink", string>;
export const palettes = {
  hacker: {
    ink: "#edf2e8",
    muted: "#a6b3ab",
    bg: "#101c1b",
    panel: "#182725",
    line: "#32433d",
    lime: "#dcf6a3",
    dark: "#17231c",
    pink: "#e9b7ae",
  },
  // Paper, indigo sea, weathered blue, and vermilion from the supplied woodblock reference.
  zen: {
    ink: "#193c50",
    muted: "#4d5e58",
    bg: "#f3e5c9",
    panel: "#eadcbe",
    line: "#a2a38d",
    lime: "#205575",
    dark: "#fff6e1",
    pink: "#9c442e",
  },
} as const satisfies Record<StyleTheme, Palette>;

const zenSurfaces = {
  "--theme-text": "#193c50",
  "--theme-on-accent": "#fff6e1",
  "--theme-border": "#84978e",
  "--theme-illustration-shadow": "#6e8990",
  "--theme-surface": "#e3d4b5",
  "--theme-surface-low": "#f4e8ce",
  "--theme-selected": "#cbd9d8",
  "--theme-chat": "#f7ebd2",
  "--theme-chat-own": "#cedfdf",
  "--theme-accent-hover": "#17445e",
  "--theme-warning": "#ecd8af",
  "--theme-danger": "#edd1c1",
  "--theme-danger-ink": "#80331f",
  "--theme-overlay": "#193c5010",
  "--theme-glow": "#20557526",
  "--theme-map": "#f3e5c9e6",
} as const;
export type ThemeStyle = CSSProperties & Partial<Record<`--${string}`, string>>;
export function styleThemeProperties(theme: StyleTheme): ThemeStyle {
  const palette = palettes[theme];
  return {
    ...Object.fromEntries(Object.entries(palette).map(([name, value]) => [`--${name}`, value])),
    ...(theme === "zen" ? zenSurfaces : {}),
    colorScheme: theme === "zen" ? "light" : "dark",
  };
}

/** Used by the Storybook canvas; the app renders the same properties on html on the server. */
export function applyStyleTheme(theme: StyleTheme, root: HTMLElement): void {
  for (const name of Object.keys(styleThemeProperties("zen"))) {
    if (name.startsWith("--")) root.style.removeProperty(name);
  }
  for (const [name, value] of Object.entries(styleThemeProperties(theme))) {
    if (name.startsWith("--")) root.style.setProperty(name, String(value));
  }
  root.style.colorScheme = theme === "zen" ? "light" : "dark";
  root.dataset.theme = theme;
}
