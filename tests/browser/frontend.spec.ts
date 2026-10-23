import { test, expect } from "@playwright/test";
import {
  frontendBudgets,
  measureFrontend,
  measurePreviewInteractions,
} from "../../scripts/frontend-metrics";

for (const width of [1440, 390]) {
  test(`public production preview stays within JS, CSS, layout, and Web Vitals budgets at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const result = await measureFrontend(page, baseURL!, "/preview");
    expect(result.overflow).toBe(false);
    expect(result.jsGzip).toBeLessThanOrEqual(frontendBudgets.previewInitialJsGzip);
    expect(result.cssGzip ?? 0).toBeLessThanOrEqual(frontendBudgets.initialCssGzip);
    expect(result.cls ?? 0).toBeLessThanOrEqual(frontendBudgets.maxCls);
    expect(result.domNodes ?? 0).toBeLessThanOrEqual(frontendBudgets.maxPreviewDomNodes);
  });

  test(`public preview stage/node navigation and lazy 3D map stay within budget at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const interaction = await measurePreviewInteractions(page, baseURL!);
    expect(interaction.stageSwitchOverflow).toBe(false);
    expect(interaction.nodeSelectOverflow).toBe(false);
    expect(interaction.mapOverflow).toBe(false);
    expect(interaction.mapFocusRestored).toBe(true);
    expect(interaction.mapLazyJsGzip).toBeGreaterThan(0);
    expect(interaction.mapLazyJsGzip).toBeLessThanOrEqual(frontendBudgets.mapLazyJsGzip);
  });

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
