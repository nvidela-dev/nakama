import spanish from "./es.json";
export type Locale = "en" | "es";
export const localeCookie = "nakama-language";
export const messages: Readonly<Record<string, string>> = spanish;
export function resolveLocale(value?: string): Locale {
  return value === "es" ? "es" : "en";
}
// English source messages are the stable lookup keys. Only interface copy goes here,
// never user-authored text or the persisted values of choices/statuses.
export function translator(locale: Locale) {
  return (source: string, values: Record<string, string | number> = {}) => {
    const message = locale === "es" ? (messages[source] ?? source) : source;
    return message.replace(/\{(\w+)\}/g, (match, key) =>
      Object.hasOwn(values, key) ? String(values[key]) : match,
    );
  };
}
export function formatDate(value: Date | string, locale: Locale) {
  return (
    new Intl.DateTimeFormat(locale === "es" ? "es-UY" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}
