import {openProjectSetup} from "./project-setup";
import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

test("project edits, deletion, and whitelist management work from the main screen", async ({ page, browser }) => {
  const admin = process.env.NAKAMA_ADMIN_EMAIL;
  if (!admin) throw new Error("Set the administrator email for this opt-in test.");
  const friend = process.env.E2E_FRIEND_EMAIL || "nakama-friend+clerk_test@example.com";
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: admin });
  await page.goto("/projects");
  const sidebar = page.locator(".main-whitelist");
  await expect(sidebar).toBeVisible();
  const name = `E2E main controls ${Date.now()}`;
  await openProjectSetup(page);
  await page.getByLabel("Project name", { exact: true }).fill(name);
  await page.getByLabel("Description", { exact: true }).fill("Disposable main screen controls check.");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: 15000 });
  const path = new URL(page.url()).pathname;
  await page.getByRole("button", { name: /Creative/ }).click();
  await expect(page.locator(".stage-card")).toHaveCount(5);
  await page.goto("/projects");
  let card = page.locator(".project-card").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.getByRole("button", { name: "Edit project", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Project name", { exact: true }).fill(`${name} edited`);
  await dialog.getByLabel("Description", { exact: true }).fill("Purpose updated from the main screen.");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Project updated.", { timeout: 15000 });
  await expect(page).toHaveURL(/\/projects$/);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  card = page.locator(".project-card").filter({ has: page.getByRole("heading", { name: `${name} edited`, exact: true }) });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Edit project", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue("Purpose updated from the main screen.");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  const allowed = sidebar.locator(".people-list li").filter({ has: page.getByText(friend, { exact: true }) });
  if (await allowed.count()) throw new Error("Test email is already allowed; refusing to modify an existing entry.");
  let added = false;
  const context = await browser.newContext();
  try {
    await sidebar.getByLabel("Email address", { exact: true }).fill(friend);
    await sidebar.getByRole("button", { name: "Allow email", exact: true }).click();
    await expect(allowed).toHaveCount(1, { timeout: 15000 });
    added = true;
    await sidebar.locator("summary").click();
    await expect(allowed).toBeVisible();
    const member = await context.newPage();
    await member.goto("/");
    await clerk.signIn({ page: member, emailAddress: friend });
    await member.goto("/projects");
    await expect(member.locator(".main-whitelist")).toHaveCount(0);
    await member.goto(path);
    await expect(member.getByRole("heading", { name: "This project isn't available." })).toBeVisible();
    await allowed.getByRole("button", { name: "Remove access", exact: true }).click();
    await expect(allowed).toHaveCount(0);
    added = false;
  } finally {
    if (added) {
      await sidebar.locator("details").evaluate((element) => { (element as HTMLDetailsElement).open = true; });
      await allowed.getByRole("button", { name: "Remove access", exact: true }).click();
      await expect(allowed).toHaveCount(0);
    }
    await context.close();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await card.getByRole("button", { name: "Delete project", exact: true }).click();
  dialog = page.getByRole("dialog");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await expect(dialog.getByRole("button", { name: "Permanently delete project", exact: true })).toBeDisabled();
  await dialog.getByRole("textbox").fill(`${name} edited`);
  await dialog.getByRole("button", { name: "Permanently delete project", exact: true }).click();
  await expect(page.locator(`a[href="${path}"]`)).toHaveCount(0, { timeout: 15000 });
  await expect(page).toHaveURL(/\/projects$/);
});
