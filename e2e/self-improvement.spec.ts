import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { Pool } from "pg";
import { projectService } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";
let fixtureId: string | undefined;
const fixtureName = `E2E self-improvement ${Date.now()}`;
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
test("self-improvement capture, answers, tasks, artifacts and experiments", async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  await page.goto("/projects");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  const setup = page.getByRole("dialog");
  await setup.getByRole("button", { name: /Self-improvement/ }).click();
  await setup.getByRole("button", { name: /Continue/ }).click();
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
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.locator(".stage-label").first()).toHaveText("Patrón");
  await page.screenshot({
    path: test.info().outputPath("self-improvement-spanish.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".stage-label").first()).toHaveText("Pattern");
  await page.goto(`/projects/${fixtureId}?stage=pattern&node=self-scope`);
  await page
    .getByLabel("Your answer, learning, or uncertainty")
    .fill("Start one chosen task before opening messages.");
  await page.getByRole("button", { name: "Save answer", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Your answer, learning, or uncertainty")).toHaveValue(
    "Start one chosen task before opening messages.",
  );
  await page.getByRole("tab", { name: "To-do", exact: true }).click();
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task title", { exact: true }).fill("Prepare tomorrow's first step");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Prepare tomorrow's first step", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Artifacts", exact: true }).click();
  await page.getByRole("button", { name: "New artifact", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Artifact name", { exact: true }).fill("Observation journal");
  await dialog.getByLabel("Artifact type", { exact: true }).selectOption("markdown");
  await dialog.getByLabel("Phase (optional)", { exact: true }).selectOption("observe");
  await dialog.getByRole("button", { name: "Create artifact", exact: true }).click();
  await page.getByLabel("Upload / replace Markdown", { exact: true }).setInputFiles({
    name: "journal.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Observations\n\nSynthetic practice journal."),
  });
  await expect(page.getByRole("article", { name: "Markdown reader" })).toContainText(
    "Synthetic practice journal.",
  );
  await page.goto(`/projects/${fixtureId}/lab`);
  await expect(
    page.getByRole("heading", { name: "Frame an experiment", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Claim · what do you want to learn?")
    .fill("A prepared first step helps me start before opening messages");
  await page
    .getByLabel("Method · how will you test it?")
    .fill("Record the first action on three synthetic mornings");
  await page
    .getByLabel("Success criteria · what would count?")
    .fill("Start with the chosen task on all three mornings");
  await page.getByRole("button", { name: "Create experiment", exact: true }).click();
  await page.getByLabel("Executor · person or external agent").fill("Synthetic browser verifier");
  await page.getByRole("button", { name: "Start run", exact: true }).click();
  await page.getByText("Add evidence or measurement", { exact: true }).click();
  await page
    .getByLabel("Retained evidence · observation, excerpt or data", { exact: true })
    .fill("All three synthetic mornings started with the chosen task.");
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
    .fill("Synthetic result only; repeat in my own routine.");
  await page.getByRole("button", { name: "Record review", exact: true }).click();
  await expect(
    page.getByText("Synthetic result only; repeat in my own routine.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Synthetic result only; repeat in my own routine.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("All three synthetic mornings started with the chosen task.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("lab-verified.png"), fullPage: true });
});
