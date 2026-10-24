"use client";
import { Select } from "@/shared/ui/controls";

import { useState, useTransition } from "react";
import { changeDensity } from "@/features/preferences/density-actions";
import { useT } from "@/shared/i18n/provider";
export function DensitySwitcher({ density }: { density: "compact" | "comfortable" }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={
        'density-control hidden lg:flex lg:items-center lg:gap-2 lg:text-[11px] lg:text-muted lg:[&_[role="alert"]]:max-w-37.5'
      }
    >
      <label
        htmlFor="desktop-density"
        className={"lg:absolute lg:w-0.25 lg:h-0.25 lg:overflow-hidden lg:[clip:rect(0,_0,_0,_0)]"}
      >
        {t("Desktop layout")}
      </label>
      <Select
        id="desktop-density"
        value={density}
        disabled={pending}
        onChange={(event) => {
          const value = event.target.value;
          setFailed(false);
          startTransition(async () => {
            try {
              await changeDensity(value);
            } catch {
              setFailed(true);
            }
          });
        }}
        className={
          "lg:bg-[#15241e] lg:text-ink lg:border lg:border-[#5f7565] lg:rounded-[7px] lg:py-1.75 lg:px-2.25 lg:[font:inherit] lg:min-h-8.5 lg:[&:focus-visible]:[outline:2px_solid_var(--color-lime)] lg:[&:focus-visible]:[outline-offset:3px]"
        }
      >
        <option value="compact">{t("Compact")}</option>
        <option value="comfortable">{t("Comfortable")}</option>
      </Select>
      {failed && <span role="alert">{t("Could not change layout. Please try again.")}</span>}
    </div>
  );
}
