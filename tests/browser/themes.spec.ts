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
    await expect(html).toHaveAttribute("data-theme", "hacker");
    await expect(picker).toHaveValue("hacker");
    await picker.selectOption("zen");
    await expect(html).toHaveAttribute("data-theme", "zen");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(243, 229, 201)");
    const cookie = (await context.cookies()).find((entry) => entry.name === "nakama-theme");
    expect(cookie?.value).toBe("zen");
    expect(cookie?.httpOnly).toBe(true);
    await page.reload();
    await expect(picker).toHaveValue("zen");
    await expect(html).toHaveAttribute("data-theme", "zen");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    const results = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(
      results.violations.filter((entry) => ["serious", "critical"].includes(entry.impact ?? "")),
    ).toEqual([]);
    await page.goto("/");
    await expect(html).toHaveAttribute("data-theme", "zen");
    await page.getByLabel("Visual style").selectOption("hacker");
    await expect(html).toHaveAttribute("data-theme", "hacker");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 28, 27)");
    expect(
      await html.evaluate((element) => element.style.getPropertyValue("--theme-surface")),
    ).toBe("");
    await context.addCookies([{ name: "nakama-theme", value: "invalid", url: baseURL! }]);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "hacker");
  });
}
