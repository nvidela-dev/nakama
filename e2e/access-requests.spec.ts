import { required } from "../src/lib/query";
import { test, expect } from "@playwright/test";
import { createClerkClient } from "@clerk/backend";
import { clerk } from "@clerk/testing/playwright";

const fixtures = new Set<string>();
test.afterEach(async () => {
  const client = createClerkClient({ secretKey: required(process.env.CLERK_SECRET_KEY) });
  const allowed = await client.allowlistIdentifiers.getAllowlistIdentifierList({ limit: 100 });
  for (const entry of allowed.data) if (fixtures.has(entry.identifier)) await client.allowlistIdentifiers.deleteAllowlistIdentifier(entry.id);
  for (const email of fixtures) {
    const pending = await client.waitlistEntries.list({ query: email, status: "pending", limit: 100 });
    for (const entry of pending.data) if (entry.emailAddress === email) await client.waitlistEntries.delete(entry.id);
  }
  fixtures.clear();
});

test("unapproved signup becomes an admin request; allowance and dismissal are explicit", async ({ page, browser }) => {
  const admin = process.env.NAKAMA_ADMIN_EMAIL;
  if (!admin) throw new Error("Set the administrator email for this opt-in test.");
  const email = `nakama-request-${Date.now()}+clerk_test@example.com`;
  fixtures.add(email);
  await page.goto("/sign-up");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".access-entry").getByRole("status")).toHaveText("Access requested. You can sign up after the administrator allows your email.", { timeout: 15000 });
  await expect(page.locator(".cl-signUp-root")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const context = await browser.newContext();
  const dashboard = await context.newPage();
  await dashboard.goto("/");
  await clerk.signIn({ page: dashboard, emailAddress: admin });
  await dashboard.goto("/admin");
  let request = dashboard.locator(".access-requests li").filter({ has: dashboard.getByText(email, { exact: true }) });
  await expect(request).toHaveCount(1);
  await request.getByRole("button", { name: "Allow email", exact: true }).click();
  await expect(request).toHaveCount(0, { timeout: 15000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".cl-signUp-root")).toBeVisible({ timeout: 15000 });
  // Clean up this disposable allowance; no Clerk account is created.
  const allowed = dashboard.locator(".people-list li").filter({ has: dashboard.getByText(email, { exact: true }) });
  await allowed.getByRole("button", { name: "Remove access", exact: true }).click();
  await expect(allowed).toHaveCount(0);
  const dismissed = `nakama-dismiss-${Date.now()}+clerk_test@example.com`;
  fixtures.add(dismissed);
  await page.goto("/access-required");
  await page.getByLabel("Email address", { exact: true }).fill(dismissed);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".access-entry").getByRole("status")).toHaveText("Access requested. You can sign up after the administrator allows your email.", { timeout: 15000 });
  await dashboard.goto("/projects");
  const details = dashboard.locator(".main-whitelist details").filter({ has: dashboard.locator("summary").filter({ hasText: "Access requests" }) });
  await details.locator("summary").click();
  request = details.locator("li").filter({ has: dashboard.getByText(dismissed, { exact: true }) });
  await expect(request).toBeVisible();
  await dashboard.setViewportSize({ width: 390, height: 844 });
  expect(await dashboard.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await request.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(request).toHaveCount(0);
  await context.unrouteAll({ behavior: "wait" });
  await context.close();
});
