import { expect, type Page } from "@playwright/test";

export async function switchLanguage(page: Page, code: "en" | "es") {
  await page
    .getByRole("group", { name: /^(Language|Idioma)$/ })
    .getByRole("button", { name: code === "es" ? "Español" : "English", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", code);
}
