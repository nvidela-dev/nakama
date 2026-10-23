"use server";

import { cookies } from "next/headers";
import { localeCookie } from "@/shared/i18n/index";
export async function changeLanguage(locale: string) {
  const { observeAction } = await import("@/server/observability/request-observability");
  return observeAction("preference.language", async () => {
    if (locale !== "en" && locale !== "es") throw new Error("Unsupported language");
    (await cookies()).set(localeCookie, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  });
}
