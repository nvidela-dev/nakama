import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { randomUUID } from "node:crypto";
test("owner can pursue a lead, record an interview and send it back to the backlog with history", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.JOBS_DATABASE_URL ||
      new URL(process.env.JOBS_DATABASE_URL).hostname !== "127.0.0.1",
    "Uses a disposable local jobs database.",
  );
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  await page.getByRole("link", { name: "Jobs and interviews" }).click();
  await expect(page.getByRole("table", { name: "Leads backlog" })).toBeVisible();
  await page.getByText("Add job lead", { exact: true }).click();
  const role = "QA role " + randomUUID();
  await page.getByLabel("Company", { exact: true }).fill("Example Labs");
  await page.getByLabel("Role title").fill(role);
  await page.getByRole("button", { name: "Save lead" }).click();
  await expect(page.getByRole("heading", { name: role })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create private Linear task" })).toHaveCount(0);
  await page.getByRole("button", { name: "Move to Pursuing" }).click();
  await expect(page.getByLabel("Board stage")).toHaveValue("pursuing");
  await page.getByLabel("Next action").fill("Practice joins");
  await page.getByLabel("Follow-up date").fill("2026-12-03");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(page.getByText("Saved.", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Event", { exact: true }).selectOption("interview");
  await page.getByLabel("What happened?").fill("Completed technical interview");
  await page.getByLabel("What to practice or do differently").fill("Explain the execution plan");
  await page.getByRole("button", { name: "Record event" }).click();
  await expect(page.getByText("Completed technical interview", { exact: true })).toBeVisible();
  await page.goto("/jobs?view=board");
  await page.getByRole("link", { name: role }).click();
  await expect(page.getByLabel("Next action")).toHaveValue("Practice joins");
  await expect(page.getByText("Explain the execution plan", { exact: false }).last()).toBeVisible();
  await page.getByLabel("Board stage").selectOption("");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(page.getByRole("button", { name: "Move to Pursuing" })).toBeVisible();
  await expect(page.getByText("Completed technical interview", { exact: true })).toBeVisible();
  const outsider = await browser.newContext();
  try {
    const other = await outsider.newPage();
    await other.goto(page.url());
    await expect(other.getByRole("heading", { name: role })).toHaveCount(0);
    await other.goto("/");
    await clerk.signIn({
      page: other,
      emailAddress: process.env.E2E_FRIEND_EMAIL || "nakama-friend+clerk_test@example.com",
    });
    await other.goto(page.url());
    await expect(other.getByRole("heading", { name: role })).toHaveCount(0);
    await expect(other.getByRole("link", { name: "Jobs and interviews", exact: true })).toHaveCount(
      0,
    );
    await expect(other.getByText("Completed technical interview", { exact: true })).toHaveCount(0);
  } finally {
    await outsider.close();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jobs");
  await page.getByRole("table", { name: "Leads backlog" }).waitFor();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
