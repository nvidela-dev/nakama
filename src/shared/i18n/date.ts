import type { Locale } from "./index";
export function formatDate(value: Date | string, locale: Locale) {
  return (
    new Intl.DateTimeFormat(locale === "es" ? "es-UY" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}
