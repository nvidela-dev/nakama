"use server";

import { setPreferenceCookie } from "./server/cookie";
export async function changeDensity(density: string) {
  const { observeAction } = await import("@/server/observability/request-observability");
  return observeAction("preference.density", async () => {
    if (density !== "compact" && density !== "comfortable") throw new Error("Unsupported density");
    await setPreferenceCookie("nakama-density", density);
  });
}
