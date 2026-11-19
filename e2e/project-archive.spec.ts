import { randomUUID } from "node:crypto";
import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { openProjectSetup } from "./project-setup";

test("an owner can archive from the dashboard and restore from either project menu", async ({
  page,
}) => {
  const name = `Archive check ${randomUUID()}`;
  const email = process.env.E2E_OWNER_EMAIL || process.env.NAKAMA_ADMIN_EMAIL;
  if (!email) throw new Error("Set an admitted owner email for this browser check.");
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/projects");
  await openProjectSetup(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project name", { exact: true }).fill(name);
  await dialog.getByLabel("Description", { exact: true }).fill("Disposable archive verification.");
  await dialog.getByRole("button", { name: "Create project", exact: true }).click();
  const projectHeading = page.getByRole("heading", { level: 1, name, exact: true });
  await expect(projectHeading).toBeVisible();
  const path = new URL(page.url()).pathname;
  const card = page
    .locator(".project-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  try {
    await page.goto("/projects");
    await card.getByRole("button", { name: "Project actions" }).click();
    await card.getByRole("button", { name: "Archive project", exact: true }).click();
    await expect(card).toHaveCount(0);
    await page.getByRole("link", { name: "Archived projects", exact: true }).click();
    await expect(card).toBeVisible();
    await page.reload();
    await card.getByRole("button", { name: "Project actions" }).click();
    await card.getByRole("button", { name: "Restore project", exact: true }).click();
    await expect(card).toHaveCount(0);
    await page.getByRole("link", { name: "Active projects", exact: true }).click();
    await card.getByRole("link").click();
    await expect(projectHeading).toBeVisible();
    const actions = page.getByRole("button", { name: "Project actions", exact: true });
    await actions.click();
    await page.getByRole("button", { name: "Archive project", exact: true }).click();
    await expect(page.getByText("Project archived.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(
      page.locator(".page-heading").getByText("Archived", { exact: true }),
    ).toBeVisible();
    await actions.click();
    await page.getByRole("button", { name: "Restore project", exact: true }).click();
    await expect(page.getByText("Project restored.", { exact: true })).toBeVisible();
    await page.goto("/projects");
    await expect(card).toBeVisible();
  } finally {
    // Clean up only the project created by this run.
    await page.goto(path);
    await expect(projectHeading).toBeVisible();
    await page.getByRole("button", { name: "Project actions", exact: true }).click();
    await page.getByRole("button", { name: "Delete project", exact: true }).click();
    const deletion = page.locator("form[id$='-delete-project-form']");
    await deletion.getByRole("textbox").fill(name);
    await deletion.getByRole("button", { name: "Permanently delete project", exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
  }
});
