import { createTranslator } from "./translate";
import spanish from "@/shared/i18n/es.json";
export type Locale = "en" | "es";
export const localeCookie = "nakama-language";
export const messages: Readonly<Record<string, string>> = spanish;
export function resolveLocale(value?: string): Locale {
  return value === "es" ? "es" : "en";
}
// English source messages are the stable lookup keys. Only interface copy goes here,
// never user-authored text or the persisted values of choices/statuses.
export function translator(locale: Locale) {
  return createTranslator(locale === "es" ? messages : {});
}
export { formatDate } from "./date";
