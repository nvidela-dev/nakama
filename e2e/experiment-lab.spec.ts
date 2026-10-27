import { openProjectSetup } from "./project-setup";
import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { Pool } from "pg";
import { projectService } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";
let fixtureId: string | undefined;
const fixtureName = `E2E experiment lab ${Date.now()}`;
test.afterEach(async () => {
  if (!fixtureId) return;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const db: Database = {
    query: (q, v) => pool.query(q, v),
    transaction: async (work) => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN");
        const result = await work(tx);
        await tx.query("COMMIT");
        return result;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    },
  };
  try {
    const row = (
      await pool.query(
        "SELECT p.name,m.user_id FROM projects p JOIN project_memberships m ON m.project_id=p.id AND m.role='owner' WHERE p.id=$1",
        [fixtureId],
      )
    ).rows[0];
    if (row?.name === fixtureName)
      await projectService(db).deleteProject(
        { userId: row.user_id, verifiedEmails: [] },
        fixtureId,
        fixtureName,
      );
  } finally {
    await pool.end();
  }
});
test("live lab database target and availability", async ({ page }) => {
  page.setDefaultTimeout(15000);
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  await page.goto("/projects");
  await openProjectSetup(page);
  await page.getByLabel("Project name", { exact: true }).fill(fixtureName);
  await page.getByLabel("Description", { exact: true }).fill("Disposable experiment verification.");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByRole("heading", { name: fixtureName, exact: true })).toBeVisible();
  fixtureId = new URL(page.url()).pathname.split("/").at(-1);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const result = await pool.query("SELECT name FROM projects WHERE id=$1", [fixtureId]);
    expect(result.rows[0]?.name).toBe(fixtureName);
    console.log("Live browser and configured database target match.");
  } finally {
    await pool.end();
  }
  await page.goto(
    process.env.LAB_PREFLIGHT ? `/projects/${fixtureId}/lab` : `/projects/${fixtureId}?view=tests`,
  );
  if (process.env.LAB_PREFLIGHT) {
    await expect(
      page.getByText(
        "The experiment lab is being prepared. Your other project tools remain available.",
      ),
    ).toBeVisible();
  } else {
    await expect(page.getByRole("tab", { name: "Tests", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("heading", { name: "Frame an experiment", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Claim · what do you want to learn?", { exact: true })
      .fill("Synthetic participants can identify the next step");
    await page
      .getByLabel("Method · how will you test it?", { exact: true })
      .fill("Observe three synthetic trials");
    await page
      .getByLabel("Success criteria · what would count?", { exact: true })
      .fill("All three identify the next step");
    await page.getByRole("button", { name: "Create experiment", exact: true }).click();
    await page.getByLabel("Executor · person or external agent").fill("Synthetic browser verifier");
    await page.getByRole("button", { name: "Start run", exact: true }).click();
    await page.getByText("Add evidence or measurement", { exact: true }).click();
    await page
      .getByLabel("Retained evidence · observation, excerpt or data", { exact: true })
      .fill("Three synthetic trials identified the next step.");
    await page
      .getByLabel("Source and attribution · URL, artifact reference or observation details", {
        exact: true,
      })
      .fill("Disposable browser fixture; no real participants.");
    await page.getByRole("button", { name: "Retain evidence", exact: true }).click();
    await page.getByText("Complete or cancel run", { exact: true }).click();
    await page.getByRole("button", { name: "Record execution outcome", exact: true }).click();
    await page.getByText("Review claim against evidence", { exact: true }).click();
    await page.locator('select[name="assessment"]').selectOption("supported");
    await page.locator('select[name="nextAction"]').selectOption("revise");
    await page
      .getByLabel("Rationale, scope and remaining uncertainty", { exact: true })
      .fill("Synthetic result only; repeat with real participants.");
    await page.getByRole("button", { name: "Record review", exact: true }).click();
    await expect(
      page.getByText("Synthetic result only; repeat with real participants.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Synthetic result only; repeat with real participants.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Three synthetic trials identified the next step.", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("lab-verified.png"), fullPage: true });
  }
});
