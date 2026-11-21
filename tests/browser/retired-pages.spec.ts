import { test, expect } from "@playwright/test";

test("educational pages have no public routes or navigation links", async ({ request, page }) => {
  const retired = ["/preview", "/wiki/experiments", "/wiki", "/wiki/glossary", "/glossary"];
  await page.goto("/");
  for (const path of retired) {
    expect((await request.get(path)).status(), path).toBe(404);
    await expect(page.locator(`a[href="${path}"]`)).toHaveCount(0);
  }
});
