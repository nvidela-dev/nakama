"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { changeLanguage } from "@/app/language-actions";
import { translator, type Locale } from "@/lib/i18n";
const LanguageContext = createContext<Locale>("en");
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={locale}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLocale() {
  return useContext(LanguageContext);
}
export function useT() {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <div className="language-control">
      <div
        className="language-switch"
        role="group"
        aria-label={t("Language")}
        aria-busy={pending}
      >
        {(["en", "es"] as const).map((language) => (
          <button
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
          </button>
        ))}
      </div>
      <span className="sr-only" role="status">
        {pending ? t("Changing language…") : ""}
      </span>
      {error && (
        <small role="alert">
          {t("Could not change language. Please try again.")}
        </small>
      )}
    </div>
  );
}
