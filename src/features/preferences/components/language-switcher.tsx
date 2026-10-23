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
    <div className="language-control">
      <div className="language-switch" role="group" aria-label={t("Language")} aria-busy={pending}>
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
          >
            {language === "en" ? "English" : "Español"}
          </Button>
        ))}
      </div>
      <span className="sr-only" role="status">
        {pending ? t("Changing language…") : ""}
      </span>
      {error && <small role="alert">{t("Could not change language. Please try again.")}</small>}
    </div>
  );
}
