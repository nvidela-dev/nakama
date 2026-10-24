import "server-only";
import { getLocale, getT } from "@/shared/i18n/server";
import { createTranslator } from "@/shared/i18n/translate";
import wikiMessages from "@/features/shell/wiki-es.json";

/** Reference prose stays on the server instead of inflating every app route's dictionary. */
export async function getWikiT() {
  const locale = await getLocale();
  const base = await getT();
  const local = createTranslator(locale === "es" ? wikiMessages : {});
  return (source: string, values: Record<string, string | number> = {}) =>
    locale === "es" && Object.hasOwn(wikiMessages, source)
      ? local(source, values)
      : base(source, values);
}
