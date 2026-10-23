import { openProjectSetup } from "./project-setup";
import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { projectService } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";
let fixtureId: string | undefined;
const fixtureName = `E2E project tasks ${Date.now()}`;
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
test("browser tasks, explicit subtree operations, Lock-In round trip, conflicts, and preserved guided drafts", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  await page.goto("/projects");
  await openProjectSetup(page);
  await page.getByLabel("Project name", { exact: true }).fill(fixtureName);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Synthetic browser to-do and interchange verification.");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByRole("heading", { name: fixtureName, exact: true })).toBeVisible();
  const path = new URL(page.url()).pathname;
  fixtureId = path.split("/").at(-1);
  await page.getByRole("tab", { name: "To-do", exact: true }).click();
  const list = page.getByRole("region", { name: "Project to-do list" });
  await list.getByRole("button", { name: "Add task", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Task title", { exact: true }).fill("Root task");
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(list.locator(".task-row")).toHaveCount(1);
  await list.getByRole("button", { name: "Add subtask 1", exact: true }).click();
  await dialog.getByLabel("Task title", { exact: true }).fill("Nested child");
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(list.locator(".task-row")).toHaveCount(2);
  await expect(list.locator(".task-number").nth(1)).toHaveText("1.1");
  await list.getByLabel("Task status 1", { exact: true }).selectOption("done");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(list.getByLabel("Task status 1", { exact: true })).toHaveValue("ready");
  await list.getByLabel("Task status 1", { exact: true }).selectOption("done");
  await dialog.getByRole("button", { name: "Task and subtasks", exact: true }).click();
  await expect(list.locator(".task-done")).toHaveCount(2);
  await list.getByRole("button", { name: "Collapse subtasks", exact: true }).click();
  await expect(list.locator(".task-row")).toHaveCount(1);
  await page.reload();
  await expect(list.locator(".task-row")).toHaveCount(1);
  await list.getByRole("button", { name: "Expand all", exact: true }).click();
  await expect(list.locator(".task-row")).toHaveCount(2);
  await list.getByRole("button", { name: "Nested child", exact: true }).click();
  await dialog.getByLabel("Task title", { exact: true }).fill("Renamed child");
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(list.getByRole("button", { name: "Renamed child", exact: true })).toBeVisible();
  await list.getByLabel("Find a task", { exact: true }).fill("1.1");
  await expect(list.locator(".task-row")).toHaveCount(2);
  await list.getByLabel("Find a task", { exact: true }).fill("");
  const stamp = "2026-10-21T12:00:00Z";
  const source = {
    version: 1,
    active_project: "local-a",
    projects: [
      {
        id: "local-a",
        name: "Lock-In sample",
        created_at: stamp,
        updated_at: stamp,
        tasks: [
          {
            id: "local-root",
            title: "Imported root",
            status: "in_progress",
            collapsed: false,
            created_at: stamp,
            updated_at: stamp,
            subtasks: [
              {
                id: "local-child",
                title: "Imported child",
                status: "ready",
                collapsed: false,
                created_at: stamp,
                updated_at: stamp,
                subtasks: null,
              },
            ],
          },
        ],
      },
      {
        id: "local-b",
        name: "Other local project",
        created_at: stamp,
        updated_at: stamp,
        tasks: [],
      },
    ],
  };
  const upload = () =>
    list.getByLabel("Lock-In JSON file").setInputFiles({
      name: "lock-in-state.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(source)),
    });
  await upload();
  await expect(dialog.getByText("Imported child", { exact: false })).toBeVisible();
  await dialog.screenshot({ path: test.info().outputPath("lock-in-import-preview.png") });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(list.locator(".task-row")).toHaveCount(2);
  await upload();
  await dialog.getByRole("button", { name: "Add imported tasks", exact: true }).click();
  await expect(list.locator(".task-row")).toHaveCount(4);
  await expect(list.getByRole("button", { name: "Imported root", exact: true })).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await list.getByRole("button", { name: "Export Lock-In", exact: true }).click();
  const download = await downloaded;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.version).toBe(1);
  expect(exported.projects).toHaveLength(1);
  expect(exported.projects[0].tasks).toHaveLength(2);
  expect(exported.projects[0].tasks[1].subtasks[0].title).toBe("Imported child");
  await upload();
  await dialog.getByRole("button", { name: "Add imported tasks", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("already been imported");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  // A second tab must not silently overwrite a task edited after its dialog opened.
  const second = await page.context().newPage();
  await second.goto(`${path}?view=tasks`);
  await second.getByRole("button", { name: "Root task", exact: true }).click();
  await second
    .getByRole("dialog")
    .getByLabel("Task title", { exact: true })
    .fill("Stale task draft");
  await list.getByRole("button", { name: "Root task", exact: true }).click();
  await dialog.getByLabel("Task title", { exact: true }).fill("New root title");
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(list.getByRole("button", { name: "New root title", exact: true })).toBeVisible();
  await second.getByRole("dialog").getByRole("button", { name: "Save task", exact: true }).click();
  await expect(second.getByRole("dialog").getByRole("alert")).toContainText("task list changed");
  await expect(second.getByRole("dialog").getByLabel("Task title", { exact: true })).toHaveValue(
    "Stale task draft",
  );
  await second
    .getByRole("button", { name: "Use latest list and keep my draft", exact: true })
    .click();
  await second.getByRole("dialog").getByRole("button", { name: "Save task", exact: true }).click();
  await expect(second.getByRole("button", { name: "Stale task draft", exact: true })).toBeVisible();
  await second.close();
  await page.reload();
  await list.getByRole("button", { name: "Delete task 1", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm deletion", exact: true }).click();
  await expect(list.locator(".task-row")).toHaveCount(2);
  await expect(list.locator(".task-number").first()).toHaveText("1");
  await page.getByRole("tab", { name: "Project steps", exact: true }).click();
  await page.getByRole("button", { name: /Creative/ }).click();
  await expect(page.locator(".stage-card")).toHaveCount(5);
  await page.goto(`${path}?stage=imagine&node=inspiration`);
  await page.getByLabel("Your answer, learning, or uncertainty").fill("Unsaved guided draft");
  await page.getByRole("tab", { name: "To-do", exact: true }).click();
  await expect(list.getByRole("button", { name: "Imported root", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Project steps", exact: true }).click();
  await expect(page.getByLabel("Your answer, learning, or uncertainty")).toHaveValue(
    "Unsaved guided draft",
  );
  await page.getByRole("tab", { name: "To-do", exact: true }).click();
  await page.setViewportSize({ width: 2560, height: 1080 });
  await list.screenshot({ path: test.info().outputPath("tasks-desktop.png") });
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("button", { name: "Agregar tarea", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Pendiente", exact: true }).first()).toHaveText(
    "Pendiente",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page
    .getByRole("region", { name: "Lista de tareas del proyecto" })
    .screenshot({ path: test.info().outputPath("tasks-phone.png") });
});
