import { switchLanguage } from "./language";
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
  await expect(page.getByRole("button", { name: "New Exploration" })).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Main navigation" });
  await expect(drawer.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await drawer.getByRole("link", { name: "Explorations", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Explorations", exact: true })).toHaveClass(
    "sr-only",
  );
  await expect(page.getByRole("button", { name: "New Exploration", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "New Exploration", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open project list" })).toHaveCount(0);
  await page.getByRole("link", { name: "Archived projects", exact: true }).click();
  await expect(page.getByRole("button", { name: "New Exploration", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Active projects", exact: true }).click();
  await switchLanguage(page, "es");
  await expect(page.getByRole("heading", { name: "Exploraciones", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva exploración", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Nueva exploración", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Inicio de Nakama", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Actividad reciente" })).toBeVisible();
  await clerk.signOut({ page });
  await page.goto("/");
  await expect(page.locator(".landing")).toBeVisible();
});
