import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [320, 1440]) {
  test(`research guide keeps its steps, examples and motion controls usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/wiki/experiments");
    await page.getByRole("button", { name: "Start the walkthrough" }).click();
    await expect(
      page.getByRole("heading", { name: "Can someone use this without help?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pause motion" }).click();
    await expect(page.getByRole("button", { name: "Enable motion" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next step" }).click();
    await expect(
      page.getByRole("heading", { name: "Observe what actually happens." }),
    ).toBeVisible();
    await page.getByText("2 of 5 complete", { exact: true }).click();
    await expect(page.getByText("2/5", { exact: true })).toBeVisible();
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Next step" }).click();
    await expect(
      page.getByRole("heading", { name: "Review the claim. Choose the next action." }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
    ).toEqual([]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Enable motion" }).click();
    await page.getByRole("button", { name: "Replay motion" }).click();
    expect(
      await page
        .locator("[data-instrument]")
        .evaluateAll((elements) => elements.flatMap((el) => el.getAnimations()).length),
    ).toBe(0);
  });
}
