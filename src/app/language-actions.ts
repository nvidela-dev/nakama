"use server";
import { cookies } from "next/headers";
import { localeCookie } from "@/lib/i18n";
export async function changeLanguage(locale: string) {
  if (locale !== "en" && locale !== "es")
    throw new Error("Unsupported language");
  (await cookies()).set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
