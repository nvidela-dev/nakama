import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { Pool } from "pg";
import { projectLinksService } from "../src/features/projects/server/project-links";
import { projectService } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";
const names: string[] = [];
function fixtureDatabase(pool: Pool): Database {
  return {
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
}
test.afterEach(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    for (const name of names) {
      const row = (
        await pool.query(
          "SELECT p.id,m.user_id FROM projects p JOIN project_memberships m ON m.project_id=p.id AND m.role='owner' WHERE p.name=$1 AND p.description='Disposable lineage verification.'",
          [name],
        )
      ).rows[0];
      if (row)
        await projectService(fixtureDatabase(pool)).deleteProject(
          { userId: row.user_id, verifiedEmails: [] },
          row.id,
          name,
        );
    }
  } finally {
    await pool.end();
  }
});
test("spawn, add several sources, navigate both ways, link/unlink existing projects, phone and Spanish", async ({
  page,
}) => {
  page.setDefaultTimeout(15000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  await page.goto("/projects");
  await page.waitForFunction(
    () => !!(window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk?.user?.id,
  );
  const userId = await page.evaluate(
    () => (window as unknown as { Clerk: { user: { id: string } } }).Clerk.user.id,
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 }),
    service = projectService(fixtureDatabase(pool));
  const suffix = Date.now(),
    aName = `Lineage A ${suffix}`,
    bName = `Lineage B ${suffix}`,
    cName = `Lineage child ${suffix}`;
  names.push(aName, bName, cName);
  let a: string, b: string;
  try {
    a = await service.create(
      { userId, verifiedEmails: [] },
      { name: aName, description: "Disposable lineage verification." },
    );
    b = await service.create(
      { userId, verifiedEmails: [] },
      { name: bName, description: "Disposable lineage verification." },
    );
    const graph = projectLinksService(fixtureDatabase(pool)),
      actor = { userId, verifiedEmails: [] };
    const results = await Promise.allSettled([
      graph.change(actor, a, b),
      graph.change(actor, b, a),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    await graph.change(actor, a, b, true);
    await graph.change(actor, b, a, true);
  } finally {
    await pool.end();
  }
  await page.goto(`/projects/${a}`);
  const panel = page.locator(".project-relations");
  await panel.locator("> summary").click();
  await panel.getByRole("button", { name: "Spawn project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Choose later", exact: true }).click();
  await dialog.getByRole("button", { name: /Continue/ }).click();
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await dialog.getByLabel("Project name", { exact: true }).fill(cName);
  await dialog.getByLabel("Description", { exact: true }).fill("Disposable lineage verification.");
  await dialog.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByRole("heading", { name: cName, exact: true })).toBeVisible();
  const childUrl = page.url();
  await panel.locator("> summary").click();
  await panel.getByText("Link an existing project", { exact: true }).click();
  await panel.getByLabel("Relationship", { exact: true }).selectOption("source");
  await panel.getByLabel("Project", { exact: true }).selectOption(b);
  await panel.getByRole("button", { name: "Link project", exact: true }).click();
  await expect(panel.getByRole("link", { name: aName, exact: true })).toBeVisible();
  await expect(panel.getByRole("link", { name: bName, exact: true })).toBeVisible();
  await panel.getByRole("link", { name: aName, exact: true }).click();
  await panel.locator("> summary").click();
  await expect(panel.getByRole("link", { name: cName, exact: true })).toBeVisible();
  await panel.getByText("Link an existing project", { exact: true }).click();
  await panel.getByLabel("Project", { exact: true }).selectOption(b);
  await panel.getByRole("button", { name: "Link project", exact: true }).click();
  await expect(panel.getByRole("link", { name: bName, exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Unlink " + bName, exact: true }).click();
  await expect(panel.getByRole("link", { name: bName, exact: true })).toHaveCount(0);
  await page.goto(childUrl);
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.locator("> summary").click();
  await expect(panel.getByRole("link", { name: aName, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await panel.screenshot({ path: "/tmp/nakama-lineage-phone.png" });
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "Proyectos vinculados", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Crear proyecto derivado", exact: true }),
  ).toBeVisible();
});
