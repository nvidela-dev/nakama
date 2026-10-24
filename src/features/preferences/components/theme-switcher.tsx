"use client";
import { useState, useTransition } from "react";
import { Select } from "@/shared/ui/controls";
import type { StyleTheme } from "@/shared/ui/style-theme";
import { useT } from "@/shared/i18n/provider";
import { changeStyleTheme } from "../theme-actions";

export function ThemeSwitcher({ theme }: { theme: StyleTheme }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div className="theme-control">
      <label className="sr-only" htmlFor="display-style">
        {t("Visual style")}
      </label>
      <Select
        id="display-style"
        value={theme}
        disabled={pending}
        aria-busy={pending || undefined}
        onChange={(event) => {
          const value = event.target.value;
          setFailed(false);
          startTransition(async () => {
            try {
              await changeStyleTheme(value);
            } catch {
              setFailed(true);
            }
          });
        }}
      >
        <option value="hacker">Hacker</option>
        <option value="zen">Zen</option>
      </Select>
      {failed && <span role="alert">{t("Could not change style. Please try again.")}</span>}
    </div>
  );
}
