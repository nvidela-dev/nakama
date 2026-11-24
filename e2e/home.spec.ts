import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

test("public landing remains separate from the signed-in digest and sidebar navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".landing")).toBeVisible();
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_OWNER_EMAIL || "nakama-owner+clerk_test@example.com",
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Recent activity", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Main navigation" });
  await expect(drawer.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await drawer.getByRole("link", { name: "Explorations", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Explorations", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Exploraciones", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Inicio de Nakama", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Actividad reciente" })).toBeVisible();
  await clerk.signOut({ page });
  await page.goto("/");
  await expect(page.locator(".landing")).toBeVisible();
});
