import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
test("home shows the public page signed out and routes signed-in users to projects", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".landing")).toBeVisible();
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_OWNER_EMAIL || "nakama-owner+clerk_test@example.com",
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Proyectos", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Inicio de Nakama", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await clerk.signOut({ page });
  await page.goto("/");
  await expect(page.locator(".landing")).toBeVisible();
});
