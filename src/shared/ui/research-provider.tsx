"use client";
import { ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";
import { palettes } from "./style-theme";
import { useStyleTheme } from "./use-style-theme";
/** Ant components share the application's research tokens. Loaded with the interactive guide. */
export function ResearchProvider({ children }: { children: ReactNode }) {
  const mode = useStyleTheme();
  const palette = palettes[mode];
  return (
    <ConfigProvider
      theme={{
        algorithm: [
          mode === "night" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          theme.compactAlgorithm,
        ],
        token: {
          colorPrimary: palette.lime,
          colorText: palette.ink,
          colorTextSecondary: palette.muted,
          colorBgContainer: palette.panel,
          colorBgLayout: palette.bg,
          colorBorder: mode === "day" ? "#7a8a77" : "#7d9380",
          colorSplit: palette.line,
          borderRadius: 9,
          fontFamily: '"Manrope Variable", system-ui, sans-serif',
          fontSize: 14,
          controlHeight: 40,
          motion: false,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
