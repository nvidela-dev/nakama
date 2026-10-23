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
    const stageTypography = await page.evaluate(() => {
      const card = document.querySelector(".stage-card")!;
      const workingColumn = document.querySelector(".project-working-column")!;
      const workingStyles = getComputedStyle(workingColumn);
      const heading = card.querySelector("h2")!;
      const label = card.querySelector(".stage-label")!;
      const small = card.querySelector("small")!;
      const hint = document.querySelector(".journey-hint")!;
      return {
        workingBorderPx: parseFloat(workingStyles.borderTopWidth),
        workingRadiusPx: parseFloat(workingStyles.borderTopLeftRadius),
        cardHeight: card.getBoundingClientRect().height,
        headingPx: parseFloat(getComputedStyle(heading).fontSize),
        labelPx: parseFloat(getComputedStyle(label).fontSize),
        smallPx: parseFloat(getComputedStyle(small).fontSize),
        hintPx: parseFloat(getComputedStyle(hint).fontSize),
      };
    });
    expect(stageTypography.workingBorderPx).toBe(1);
    expect(stageTypography.workingRadiusPx).toBe(10);
    if (width === 1440) {
      expect(stageTypography.headingPx).toBeLessThanOrEqual(12.5);
      expect(stageTypography.labelPx).toBeLessThanOrEqual(9);
      expect(stageTypography.smallPx).toBeLessThanOrEqual(9.5);
      expect(stageTypography.hintPx).toBeLessThanOrEqual(10.5);
      expect(stageTypography.cardHeight).toBeLessThan(60);
    } else {
      expect(stageTypography.headingPx).toBeLessThanOrEqual(14);
      expect(stageTypography.smallPx).toBeLessThanOrEqual(9.5);
    }
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
    const expandedHeadingPx = await page
      .locator(".journey-stage-heading .stage-heading-row h2")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const answerHeadingPx = await page
      .locator(".answer-panel h2")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    if (width === 1440) {
      expect(expandedHeadingPx).toBeLessThanOrEqual(13);
      expect(answerHeadingPx).toBeLessThanOrEqual(14);
    } else {
      expect(expandedHeadingPx).toBeLessThanOrEqual(14);
      expect(answerHeadingPx).toBeLessThanOrEqual(16);
    }
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
