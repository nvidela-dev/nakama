import { expect, type Page } from "@playwright/test";

export async function switchLanguage(page: Page, code: "en" | "es") {
  await page.getByRole("button", { name: /^(Language|Idioma)$/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: code === "es" ? "Español" : "English", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", code);
}
