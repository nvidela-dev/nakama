"use server";
import { cookies } from "next/headers";
import { styleThemes } from "@/shared/ui/style-theme";

export async function changeStyleTheme(theme: string) {
  const { observeAction } = await import("@/server/observability/request-observability");
  return observeAction("preference.theme", async () => {
    if (!styleThemes.some((value) => value === theme)) throw new Error("Unsupported style");
    (await cookies()).set("nakama-theme", theme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  });
}
