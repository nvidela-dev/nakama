import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function story(page: import("@playwright/test").Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  await page.locator("#storybook-root").waitFor();
}
test("dialog traps focus, closes with Escape and restores its trigger", async ({ page }) => {
  await story(page, "ui-dialog--interactive");
  const trigger = page.getByRole("button", { name: "Open dialog" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Create a project" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Project name")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Close dialog" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("tab keyboard navigation preserves drafts in inactive panels", async ({ page }) => {
  await story(page, "ui-tabs--persistent-panels");
  await page.getByLabel("Draft").fill("Keep this draft");
  await page.getByRole("tab", { name: "Project steps" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "To-do" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Plan the next small step.");
  await page.keyboard.press("Home");
  await expect(page.getByLabel("Draft")).toHaveValue("Keep this draft");
});
for (const id of [
  "ui-button--primary",
  "ui-button--pending",
  "ui-form-controls--fields",
  "ui-form-controls--invalid",
  "ui-feedback-and-surfaces--empty",
  "ui-feedback-and-surfaces--error",
  "ui-loading--skeleton",
  "ui-progress-marker--partial",
  "ui-markdown--document",
  "features-guided-flows-type-picker--selectable",
]) {
  test(`no serious accessibility violations: ${id}`, async ({ page }) => {
    await story(page, id);
    await page.locator("#storybook-root").locator("> *").first().waitFor();
    const results = await new AxeBuilder({ page }).include("#storybook-root").analyze();
    expect(
      results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
    ).toEqual([]);
  });
}
test("the workflow picker stays compact on a phone and supports Spanish", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/iframe.html?id=features-guided-flows-type-picker--selectable&viewMode=story&globals=locale:es;density:compact",
  );
  await expect(page.getByRole("button", { name: /Investigación/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("progress fill remains concentric", async ({ page }) => {
  await story(page, "ui-progress-marker--partial");
  const offsets = await page.locator(".progress-marker").evaluate((element) => {
    const parent = getComputedStyle(element),
      fill = getComputedStyle(element, "::before"),
      matrix = new DOMMatrix(fill.transform);
    return {
      x:
        parseFloat(parent.borderLeftWidth) +
        parseFloat(fill.left) +
        parseFloat(fill.width) / 2 +
        matrix.m41 -
        element.getBoundingClientRect().width / 2,
      y:
        parseFloat(parent.borderTopWidth) +
        parseFloat(fill.top) +
        parseFloat(fill.height) / 2 +
        matrix.m42 -
        element.getBoundingClientRect().height / 2,
    };
  });
  expect(Math.abs(offsets.x)).toBeLessThan(0.1);
  expect(Math.abs(offsets.y)).toBeLessThan(0.1);
});
