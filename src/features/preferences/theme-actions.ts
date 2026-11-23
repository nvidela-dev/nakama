"use server";
import { setPreferenceCookie } from "./server/cookie";
import { styleThemes } from "@/shared/ui/style-theme";

export async function changeStyleTheme(theme: string) {
  const { observeAction } = await import("@/server/observability/request-observability");
  return observeAction("preference.theme", async () => {
    if (!styleThemes.some((value) => value === theme)) throw new Error("Unsupported style");
    await setPreferenceCookie("nakama-theme", theme);
  });
}
