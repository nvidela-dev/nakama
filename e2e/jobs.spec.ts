import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { jobDate } from "../src/features/jobs/model";
import { Client } from "pg";
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
  page.setDefaultTimeout(15_000);
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  const ownerId = await page.evaluate(
    () => (window as unknown as { Clerk: { user: { id: string } } }).Clerk.user.id,
  );
  const db = new Client({ connectionString: process.env.JOBS_DATABASE_URL });
  await db.connect();
  try {
    await db.query(
      "INSERT INTO nakama_jobs.resume_profiles(owner_id,skills) VALUES ($1,ARRAY['React']) ON CONFLICT DO NOTHING",
      [ownerId],
    );
  } finally {
    await db.end();
  }
  await page.getByRole("link", { name: "Jobs and interviews" }).click();
  await expect(page.getByRole("table", { name: "Leads backlog" })).toBeVisible();
  const headers = page.getByRole("columnheader");
  const matchHeader = headers.nth(0);
  const dateHeader = headers.nth(1);
  await expect(matchHeader).toHaveAccessibleName("Résumé match");
  await expect(dateHeader).toHaveAccessibleName("Date found");
  await expect(dateHeader).toHaveAttribute("aria-sort", "descending");
  await dateHeader.getByRole("link").click();
  await expect(dateHeader).toHaveAttribute("aria-sort", "ascending");
  await matchHeader.getByRole("link").click();
  await expect(matchHeader).toHaveAttribute("aria-sort", "descending");
  await matchHeader.getByRole("link").click();
  await expect(matchHeader).toHaveAttribute("aria-sort", "ascending");
  await dateHeader.getByRole("link").click();
  await expect(dateHeader).toHaveAttribute("aria-sort", "descending");
  await page.getByText("Add job lead", { exact: true }).click();
  const role = "QA role " + randomUUID();
  await page.getByLabel("Company", { exact: true }).fill("Example Labs");
  await page.getByLabel("Role title").fill(role);
  const twoWeeksAgo = new Date(jobDate() + "T00:00:00Z");
  twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
  const foundDate = twoWeeksAgo.toISOString().slice(0, 10);
  await page.getByLabel("Date found", { exact: true }).fill(foundDate);
  await page.getByLabel("Skills listed for the role").fill("React and Rust");
  await page.getByRole("button", { name: "Save lead" }).click();
  await expect(page.getByRole("heading", { name: role })).toBeVisible();
  await expect(page.getByText(foundDate, { exact: true })).toBeVisible();
  await page.goto("/jobs");
  await page.getByRole("combobox", { name: "Found", exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.waitForURL((url) => url.searchParams.get("found") === "2");
  const group = page
    .locator("tbody")
    .filter({ has: page.getByRole("rowheader", { name: "2 weeks ago" }) });
  await expect(group.getByRole("link", { name: role })).toBeVisible();
  await expect(group.locator("time").filter({ hasText: foundDate }).first()).toBeVisible();
  const row = group.getByRole("row").filter({ has: page.getByRole("link", { name: role }) });
  const score = row.getByRole("meter", { name: "Résumé match" });
  await expect(score).toHaveAttribute("aria-valuenow", "50");
  await expect(score).toHaveAttribute("aria-valuetext", "1 of 2 listed skills");
  await row.locator("summary").click();
  await expect(row.getByText("On your résumé", { exact: true })).toBeVisible();
  await expect(row.getByText("Rust", { exact: true })).toBeVisible();
  await matchHeader.getByRole("link").click();
  await expect(matchHeader).toHaveAttribute("aria-sort", "descending");
  await expect(page.getByRole("rowheader")).toHaveCount(0);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/sort=match/);
  await expect(page.getByLabel("Found", { exact: true })).toHaveValue("2");
  await page.getByRole("link", { name: role }).click();
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
  await expect(
    page.getByRole("listitem").filter({ hasText: "Completed technical interview" }),
  ).toBeVisible();
  await page.goto("/jobs?view=board");
  await page.getByRole("link", { name: role }).click();
  await expect(page.getByLabel("Next action")).toHaveValue("Practice joins");
  await expect(page.getByText("Explain the execution plan", { exact: false }).last()).toBeVisible();
  await page.getByLabel("Board stage").selectOption("");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(page.getByRole("button", { name: "Move to Pursuing" })).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Completed technical interview" }),
  ).toBeVisible();
  const outsider = await browser.newContext({ baseURL: new URL(page.url()).origin });
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
