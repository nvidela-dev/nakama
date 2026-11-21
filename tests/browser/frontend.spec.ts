import { test, expect } from "@playwright/test";
import { frontendBudgets, measureFrontend } from "../../scripts/frontend-metrics";

for (const width of [1440, 390]) {
  test(`public landing route stays within JS and layout budgets at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const result = await measureFrontend(page, baseURL!, "/");
    expect(result.overflow).toBe(false);
    expect(result.jsGzip).toBeLessThanOrEqual(frontendBudgets.landingInitialJsGzip);
    expect(result.cls ?? 0).toBeLessThanOrEqual(frontendBudgets.maxCls);
  });
}
