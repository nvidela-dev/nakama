import { test, expect } from "@playwright/test";
import { measureFrontend } from "../../scripts/frontend-metrics";
for (const width of [1440, 390])
  test(`public production preview stays within its JS budget at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const result = await measureFrontend(page, baseURL!);
    expect(result.overflow).toBe(false);
    expect(result.jsGzip).toBeLessThanOrEqual(220_000);
    const trigger = page.getByRole("button", { name: "Show 3D mini-view" });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "3D stage map" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
