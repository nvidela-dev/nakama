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
        className="language-switch flex items-center gap-1"
        role="group"
        aria-label={t("Language")}
        aria-busy={pending}
      >
        {(["en", "es"] as const).map((language) => (
          <Button
            key={language}
            type="button"
            lang={language}
            size="small"
            className="pointer-coarse:min-w-11! pointer-coarse:min-h-11!"
            title={language === "en" ? "English" : "Español"}
            aria-label={language === "en" ? "English" : "Español"}
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
            variant={locale === language ? "secondary" : "ghost"}
          >
            {language.toUpperCase()}
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
