"use client";
import { ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";
import { palettes, type StyleTheme } from "./style-theme";
export function DesignProvider({ mode, children }: { mode: StyleTheme; children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: mode === "night" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: { Empty: { colorTextDescription: mode === "night" ? "#bfbfbf" : "#595959" } },
        token: {
          colorLink: palettes[mode].lime,
          colorLinkHover: palettes[mode].ink,
          colorLinkActive: palettes[mode].ink,
          motion: false,
          colorPrimary: mode === "night" ? "#486374" : "#405869",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
