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
    <div className="theme-control flex items-center gap-2 text-[11px] text-muted">
      <label className="sr-only" htmlFor="display-style">
        {t("Visual style")}
      </label>
      <Select
        id="display-style"
        className="h-7.5 min-h-7.5 px-2 py-1 border border-line rounded-[7px] bg-panel text-ink font-[inherit] focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-3 pointer-coarse:min-h-11"
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
        <option value="day">{t("Daylight")}</option>
        <option value="night">{t("Evening")}</option>
      </Select>
      {failed && (
        <span role="alert" className="max-w-40">
          {t("Could not change style. Please try again.")}
        </span>
      )}
    </div>
  );
}
