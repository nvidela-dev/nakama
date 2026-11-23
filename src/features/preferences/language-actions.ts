"use server";

import { setPreferenceCookie } from "./server/cookie";
import { localeCookie } from "@/shared/i18n/index";
export async function changeLanguage(locale: string) {
  const { observeAction } = await import("@/server/observability/request-observability");
  return observeAction("preference.language", async () => {
    if (locale !== "en" && locale !== "es") throw new Error("Unsupported language");
    await setPreferenceCookie(localeCookie, locale);
  });
}
