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
  if (!process.env.LAB_PREFLIGHT) {
    await page.getByText("Link Linear project", { exact: true }).click();
    const address = "https://linear.app/example/project/synthetic-project";
    const input = page.getByLabel("Linear project URL");
    await input.fill(address);
    const stale = await page.context().newPage();
    await stale.goto(page.url());
    await stale.getByText("Link Linear project", { exact: true }).click();
    await page.getByRole("button", { name: "Save Linear link" }).click();
    const link = page.getByRole("link", { name: "Open Linear project" });
    await expect(link).toHaveAttribute("href", address);
    await stale.getByLabel("Linear project URL").fill(address + "-other");
    await stale.getByRole("button", { name: "Save Linear link" }).click();
    await expect(stale.getByText("The Linear link changed. Reload before saving.")).toBeVisible();
    await stale.close();
    await page
      .context()
      .route(address, (route) => route.fulfill({ status: 200, body: "Test destination" }));
    const [opened] = await Promise.all([page.waitForEvent("popup"), link.click()]);
    await expect(opened).toHaveURL(address);
    await opened.close();
    await page.reload();
    await page.getByText("Edit Linear link", { exact: true }).click();
    await input.fill("");
    await page.getByRole("button", { name: "Save Linear link" }).click();
    await expect(link).toHaveCount(0);
    const projectUrl = page.url();
    await page.getByRole("link", { name: "Project context", exact: true }).click();
    await expect(page.locator("pre")).toContainText(fixtureName);
    const download = page.getByRole("link", { name: "Download Markdown" });
    const url = await download.getAttribute("href");
    const response = await page.request.get(url!);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["content-type"]).toContain("text/markdown");
    expect(await response.text()).toContain(fixtureName);
    await page.goto(projectUrl);
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
    await expect(page.getByRole("tab", { name: "Iterations", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("heading", { name: "Plan an iteration", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("lab-setup-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: test.info().outputPath("lab-setup-phone.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page
      .getByLabel("Claim · what do you want to learn?", { exact: true })
      .fill("Synthetic participants can identify the next step");
    await page
      .getByLabel("Method · how will you test it?", { exact: true })
      .fill("Observe three synthetic trials");
    await page
      .getByLabel("Success criteria · what would count?", { exact: true })
      .fill("All three identify the next step");
    await page.getByRole("button", { name: "Create iteration", exact: true }).click();
    await page.getByRole("combobox", { name: "Iteration stage", exact: true }).selectOption("run");
    await page.getByRole("button", { name: "Move iteration" }).click();
    await expect(
      page.getByRole("region", { name: "Trying it", exact: true }).getByRole("button"),
    ).toBeVisible();
    await page.getByText("Reflection questions", { exact: true }).click();
    const reflection = page.getByRole("textbox", { name: "What did you learn?", exact: true });
    const save = page
      .locator("fieldset")
      .filter({ has: reflection })
      .getByRole("button", { name: "Save reflection" });
    await reflection.fill("The first trial was inconclusive.");
    await save.click();
    await expect(page.getByRole("link", { name: "Reflection history · 1" })).toBeVisible();
    await reflection.fill("We need a larger sample.");
    await save.click();
    await page.getByRole("link", { name: "Reflection history · 2" }).click();
    await expect(
      page.getByText("The first trial was inconclusive.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "#1", exact: true }).click();
    await page.reload();
    await expect(page.locator("#revision-1")).toContainText("The first trial was inconclusive.");
    await page.getByRole("link", { name: "Iterations", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Iteration stage", exact: true })).toHaveValue(
      "run",
    );
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
    await page.locator('select[name="kind"]').selectOption("measurement");
    await page.getByLabel("Measured value (blank if unknown)", { exact: true }).fill("0");
    await page.getByLabel("Unit", { exact: true }).fill("errors");
    await page.getByRole("button", { name: "Retain evidence", exact: true }).click();
    await expect(
      page.getByRole("img", { name: "Recorded measurements · errors", exact: true }),
    ).toBeVisible();
    for (const [value, unit] of [
      ["-2", "errors"],
      ["3", "seconds"],
      ["unknown", "seconds"],
    ]) {
      await page
        .getByLabel("Retained evidence · observation, excerpt or data", { exact: true })
        .fill(`Synthetic measurement ${value} ${unit}`);
      await page
        .getByLabel("Source and attribution · URL, artifact reference or observation details", {
          exact: true,
        })
        .fill("Disposable graph fixture");
      await page.locator('select[name="kind"]').selectOption("measurement");
      await page.getByLabel("Measured value (blank if unknown)", { exact: true }).fill(value!);
      await page.getByLabel("Unit", { exact: true }).fill(unit!);
      await page.getByRole("button", { name: "Retain evidence", exact: true }).click();
      await expect(
        page.getByText(`Synthetic measurement ${value} ${unit}`, { exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("img", { name: "Recorded measurements · errors", exact: true }),
    ).toContainText("-2");
    await expect(
      page.getByRole("img", { name: "Recorded measurements · seconds", exact: true }),
    ).not.toContainText("unknown");
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: test.info().outputPath("lab-results-phone.png"),
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
