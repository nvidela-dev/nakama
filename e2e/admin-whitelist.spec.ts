import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

test("administrator manages exact-email admission without granting project membership", async ({ page, browser }) => {
  const admin = process.env.NAKAMA_ADMIN_EMAIL;
  if (!admin) throw new Error("Set the administrator email for this opt-in test.");
  const friend = process.env.E2E_FRIEND_EMAIL || "nakama-friend+clerk_test@example.com";
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: admin });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
  const friendEntry = () => page.locator(".people-list li").filter({ has: page.getByText(friend, { exact: true }) });
  if (await friendEntry().count()) throw new Error("The test email is already allowed; refusing to change an existing entry.");
  const context = await browser.newContext();
  const member = await context.newPage();
  await member.goto("/");
  await clerk.signIn({ page: member, emailAddress: friend });
  await member.goto("/projects");
  await expect(member).toHaveURL(/\/access-required$/);
  let added = false;
  try {
    await page.getByLabel("Email address", { exact: true }).fill(friend);
    await page.getByRole("button", { name: "Allow email", exact: true }).click();
    await expect(friendEntry()).toBeVisible();
    added = true;
    await member.goto("/projects");
    await expect(member.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
    await member.goto("/admin");
    await expect(member.getByRole("heading", { name: "This project isn't available." })).toBeVisible();
    await page.goto("/projects");
    const name = `E2E whitelist ${Date.now()}`;
    await page.getByLabel("Project name", { exact: true }).fill(name);
    await page.getByLabel("Description", { exact: true }).fill("Disposable whitelist access boundary check.");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: 15000 });
    const projectPath = new URL(page.url()).pathname;
    await member.goto(projectPath);
    await expect(member.getByRole("heading", { name: "This project isn't available." })).toBeVisible();
    await page.getByRole("button", { name: "Delete project", exact: true }).click();
    await page.locator("form[id$='-delete-project-form']").getByRole("textbox").fill(name);
    await page.getByRole("button", { name: "Permanently delete project", exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.goto("/admin");
    await friendEntry().getByRole("button", { name: "Remove access", exact: true }).click();
    await expect(friendEntry()).toHaveCount(0);
    added = false;
    await member.goto("/projects");
    await expect(member).toHaveURL(/\/access-required$/);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.getByRole("button", { name: "Español", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Administración", exact: true })).toBeVisible();
  } finally {
    if (added) {
      await page.goto("/admin");
      await friendEntry().getByRole("button", { name: "Remove access", exact: true }).click();
      await expect(friendEntry()).toHaveCount(0);
    }
    await context.close();
  }
});
