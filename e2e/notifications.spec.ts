import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { Pool } from "pg";
import type { Database } from "../src/server/database/database";
import { projectService } from "../src/features/projects/server/projects";
import { collaborationService } from "../src/features/collaboration/server/collaboration";
import { guidanceService } from "../src/features/guidance/server/guidance";
test("bell preserves unread state until explicit read or visible discussion, with deep links and mobile layout", async ({
  page,
}) => {
  test.setTimeout(180000);
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
      } catch (e) {
        await tx.query("ROLLBACK");
        throw e;
      } finally {
        tx.release();
      }
    },
  };
  let id: string | undefined;
  const name = "E2E notifications " + Date.now();
  let owner: { userId: string; verifiedEmails: string[] } | undefined;
  try {
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
    await page.goto("/projects");
    await expect
      .poll(() =>
        page.evaluate(
          () => !!(window as unknown as { Clerk?: { user?: { id: string } } }).Clerk?.user?.id,
        ),
      )
      .toBe(true);
    const userId = await page.evaluate(
      () => (window as unknown as { Clerk: { user: { id: string } } }).Clerk.user.id,
    );
    owner = { userId, verifiedEmails: [] };
    const projects = projectService(db),
      comments = collaborationService(db);
    id = await projects.create(owner, {
      name,
      description: "Synthetic unread comments browser verification.",
    });
    await guidanceService(db).select(owner, id, "creative");
    const friend = {
      userId: "e2e-notification-author-" + Date.now(),
      displayName: "Test collaborator",
      verifiedEmails: ["notification-fixture@example.invalid"],
    };
    const invitation = await projects.invite(owner, id, friend.verifiedEmails[0]);
    await projects.accept(friend, invitation.token);
    const old = await comments.post(
      friend,
      id,
      { stageId: "imagine", nodeId: "inspiration" },
      "Older unread fixture",
    );
    for (let n = 0; n < 27; n++)
      await comments.post(
        friend,
        id,
        { stageId: "imagine", nodeId: "inspiration" },
        "Newer fixture " + n,
      );
    await page.reload();
    const bell = page.getByRole("button", { name: /Unread comments/ });
    await expect(bell).toContainText(/\d/);
    await bell.click();
    const panel = page.getByRole("region", { name: "Unread comments", exact: true });
    await expect(panel.getByText("Newer fixture 26", { exact: true })).toBeVisible();
    const countBefore = Number((await bell.getAttribute("aria-label"))!.split(": ").at(-1));
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await bell.click();
    await expect(bell).toHaveAttribute("aria-label", `Unread comments: ${countBefore}`);
    await panel.getByRole("button", { name: "Mark as read", exact: true }).first().click();
    await expect(bell).toHaveAttribute("aria-label", `Unread comments: ${countBefore - 1}`);
    while (
      await panel.getByRole("button", { name: "Older unread comments", exact: true }).count()
    ) {
      const previous = await panel.locator("li").count();
      await panel.getByRole("button", { name: "Older unread comments", exact: true }).click();
      await expect.poll(() => panel.locator("li").count()).toBeGreaterThan(previous);
    }
    await panel.evaluate((el) => {
      el.scrollTop = 0;
    });
    expect(
      await panel.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return [0.25, 0.5, 0.75].every((part) =>
          el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height * part)),
        );
      }),
    ).toBe(true);
    await panel.screenshot({ path: test.info().outputPath("notification-bell.png") });
    await panel.locator('a[href*="comment=' + old + '"]').click();
    await expect(page.locator(`#comment-${old}`)).toBeVisible();
    await expect
      .poll(async () =>
        Number(
          (
            await pool.query(
              "SELECT count(*)::int AS n FROM comment_reads WHERE comment_id=$1 AND user_id=$2",
              [old, userId],
            )
          ).rows[0].n,
        ),
      )
      .toBe(1);
    await page.setViewportSize({ width: 1440, height: 900 });
    const positions = await page
      .locator(".workspace-columns")
      .evaluate((el) =>
        [...el.children]
          .filter((e) =>
            e.matches(".project-working-column,.project-discussion-column,.project-sidebar"),
          )
          .map((e) => ({ className: e.className, x: e.getBoundingClientRect().x })),
      );
    expect(positions.find((e) => e.className.includes("discussion"))!.x).toBeLessThan(
      positions.find((e) => e.className.includes("working"))!.x,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await bell.click();
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await panel.screenshot({ path: test.info().outputPath("notification-phone.png") });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Español", exact: true }).click();
    await expect(page.getByRole("button", { name: /Comentarios sin leer/ })).toBeVisible();
  } finally {
    if (id && owner) await projectService(db).deleteProject(owner, id, name);
    await pool.end();
  }
});
