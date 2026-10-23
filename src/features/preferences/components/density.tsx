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
    <div className="density-control">
      <label htmlFor="desktop-density">{t("Desktop layout")}</label>
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
      >
        <option value="compact">{t("Compact")}</option>
        <option value="comfortable">{t("Comfortable")}</option>
      </Select>
      {failed && <span role="alert">{t("Could not change layout. Please try again.")}</span>}
    </div>
  );
}
