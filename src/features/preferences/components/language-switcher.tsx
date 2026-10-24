"use client";
import { Button } from "@/shared/ui/button";

import { useState, useTransition } from "react";
import { changeLanguage } from "../language-actions";
import { useLocale, useT } from "@/shared/i18n/provider";
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <div className={"language-control relative shrink-0"}>
      <div
        className={"language-switch flex border border-[#5f7565] rounded-[999px] p-0.75 gap-[2px]"}
        role="group"
        aria-label={t("Language")}
        aria-busy={pending}
      >
        {(["en", "es"] as const).map((language) => (
          <Button
            key={language}
            type="button"
            lang={language}
            aria-pressed={locale === language}
            disabled={pending}
            onClick={() => {
              if (language === locale) return;
              setError(false);
              startTransition(async () => {
                try {
                  await changeLanguage(language);
                } catch {
                  setError(true);
                }
              });
            }}
            className={
              'min-h-9 py-1.5 px-2.5 border-0 rounded-[999px] text-[12px] bg-transparent text-ink max-[700px]:min-h-10 max-[700px]:px-2 [&[aria-pressed="true"]]:bg-lime [&[aria-pressed="true"]]:[color:#14241a] [&:focus-visible]:[outline:2px_solid_var(--color-lime)] [&:focus-visible]:[outline-offset:3px]'
            }
          >
            {language === "en" ? "English" : "Español"}
          </Button>
        ))}
      </div>
      <span
        className={
          "sr-only absolute w-0.25 h-0.25 p-0 -m-0.25 overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0"
        }
        role="status"
      >
        {pending ? t("Changing language…") : ""}
      </span>
      {error && <small role="alert">{t("Could not change language. Please try again.")}</small>}
    </div>
  );
}
