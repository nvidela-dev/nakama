"use client";

import { Button } from "@/shared/ui/button";
import { useState, useTransition } from "react";
import { changeLanguage } from "../language-actions";
import { useLocale, useT } from "@/shared/i18n/provider";

const languages = [
  { code: "en", label: "English", mark: "EN" },
  { code: "es", label: "Español", mark: "ES" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <div className="language-control relative shrink-0">
      <div
        role="group"
        aria-label={t("Language")}
        aria-busy={pending || undefined}
        className="flex items-center rounded-lg bg-bg p-0.5 ring-1 ring-inset ring-line"
      >
        {languages.map(({ code, label, mark }) => (
          <Button
            key={code}
            lang={code}
            title={label}
            aria-label={label}
            aria-pressed={code === locale}
            aria-disabled={pending || undefined}
            variant="ghost"
            className="h-10! min-w-10! rounded-md! px-1! focus-visible:outline-2 focus-visible:outline-lime sm:h-8! sm:min-w-8!"
            onClick={() => {
              if (pending || code === locale) return;
              setError(false);
              startTransition(async () => {
                try {
                  await changeLanguage(code);
                } catch {
                  setError(true);
                }
              });
            }}
          >
            <span
              aria-hidden="true"
              className={
                code === locale
                  ? "grid size-6 place-items-center rounded-sm bg-lime font-mono text-[11px] font-bold leading-none text-dark"
                  : "grid size-6 place-items-center rounded-sm font-mono text-[11px] font-semibold leading-none text-muted"
              }
            >
              {mark}
            </span>
          </Button>
        ))}
      </div>
      <span className="sr-only" role="status">
        {pending ? t("Changing language…") : ""}
      </span>
      {error && (
        <small
          role="alert"
          className="absolute right-0 top-full z-50 mt-1 w-52 rounded border border-line bg-panel p-2"
        >
          {t("Could not change language. Please try again.")}
        </small>
      )}
    </div>
  );
}
