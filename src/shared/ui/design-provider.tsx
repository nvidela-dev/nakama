"use client";
import { ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";
import type { StyleTheme } from "./style-theme";
export function DesignProvider({ mode, children }: { mode: StyleTheme; children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: mode === "night" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: { Empty: { colorTextDescription: mode === "night" ? "#bfbfbf" : "#595959" } },
        token: { motion: false, colorPrimary: mode === "night" ? "#1668dc" : "#0958d9" },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
