import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 1440]) {
  test(`saved styles apply across reloads and remain accessible at ${width}px`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/preview");
    const html = page.locator("html");
    const picker = page.getByLabel("Visual style");
    await expect(html).toHaveAttribute("data-theme", "day");
    await expect(picker).toHaveValue("day");
    await picker.selectOption("night");
    await expect(html).toHaveAttribute("data-theme", "night");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(20, 36, 31)");
    const cookie = (await context.cookies()).find((entry) => entry.name === "nakama-theme");
    expect(cookie?.value).toBe("night");
    expect(cookie?.httpOnly).toBe(true);
    await page.reload();
    await expect(picker).toHaveValue("night");
    await expect(html).toHaveAttribute("data-theme", "night");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    const results = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(
      results.violations.filter((entry) => ["serious", "critical"].includes(entry.impact ?? "")),
    ).toEqual([]);
    await page.goto("/");
    await expect(html).toHaveAttribute("data-theme", "night");
    await page.getByLabel("Visual style").selectOption("day");
    await expect(html).toHaveAttribute("data-theme", "day");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 244, 234)");
    expect(
      await html.evaluate((element) => element.style.getPropertyValue("--theme-surface")),
    ).toBe("#e8eddf");
    await context.addCookies([{ name: "nakama-theme", value: "invalid", url: baseURL! }]);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "day");
  });
}
