"use client";
import { useState, useTransition } from "react";
import { changeDensity } from "@/app/density-actions";
import { useT } from "./language";
export function DensitySwitcher({
  density,
}: {
  density: "compact" | "comfortable";
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div className="density-control">
      <label htmlFor="desktop-density">{t("Desktop layout")}</label>
      <select
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
      </select>
      {failed && (
        <span role="alert">
          {t("Could not change layout. Please try again.")}
        </span>
      )}
    </div>
  );
}
