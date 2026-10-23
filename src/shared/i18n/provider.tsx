"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./index";
import { createTranslator, type Dictionary } from "./translate";
const emptyDictionary: Dictionary = {};
const LanguageContext = createContext<{ locale: Locale; dictionary: Dictionary }>({
  locale: "en",
  dictionary: emptyDictionary,
});
export function LanguageProvider({
  locale,
  dictionary = emptyDictionary,
  children,
}: {
  locale: Locale;
  dictionary?: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, dictionary }), [locale, dictionary]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLocale() {
  return useContext(LanguageContext).locale;
}
export function useT() {
  const { dictionary } = useContext(LanguageContext);
  return useMemo(() => createTranslator(dictionary), [dictionary]);
}
