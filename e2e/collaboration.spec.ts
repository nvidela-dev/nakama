import { required } from "../src/server/database/query";
import { openProjectSetup } from "./project-setup";
import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { Pool } from "pg";
import { projectService } from "../src/features/projects/server/projects";
let allowance: string | undefined;
let fixtureId: string | undefined;
const fixtureName = `E2E comments ${Date.now()}`;
test.afterEach(async () => {
  if (fixtureId) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const db = {
      query: (q: string, v?: unknown[]) => pool.query(q, v),
      transaction: async <T>(
        work: (tx: import("../src/server/database/database").Queryable) => Promise<T>,
      ) => {
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
          row.name,
        );
    } finally {
      await pool.end();
    }
  }
  if (allowance)
    await createClerkClient({
      secretKey: required(process.env.CLERK_SECRET_KEY),
    }).allowlistIdentifiers.deleteAllowlistIdentifier(allowance);
});
test("two-person scoped comments, conflict handling, moderation, activity, and removed access", async ({
  page,
  browser,
}) => {
  const admin = process.env.NAKAMA_ADMIN_EMAIL;
  if (!admin) throw Error("Administrator email required");
  const friendEmail = process.env.E2E_FRIEND_EMAIL || "nakama-friend+clerk_test@example.com";
  const client = createClerkClient({ secretKey: required(process.env.CLERK_SECRET_KEY) });
  const existing = await client.allowlistIdentifiers.getAllowlistIdentifierList({ limit: 100 });
  if (existing.data.some((e) => e.identifier === friendEmail))
    throw Error("Test identity is already allowed; refusing to modify an existing entry");
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: admin });
  await page.goto("/admin");
  await page.getByLabel("Email address", { exact: true }).fill(friendEmail);
  await page.getByRole("button", { name: "Allow email", exact: true }).click();
  await expect(page.getByText(friendEmail, { exact: true })).toBeVisible();
  allowance = (
    await client.allowlistIdentifiers.getAllowlistIdentifierList({ limit: 100 })
  ).data.find((e) => e.identifier === friendEmail)!.id;
  await page.goto("/projects");
  await openProjectSetup(page);
  await page.getByLabel("Project name", { exact: true }).fill(fixtureName);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Disposable collaboration browser check.");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByRole("heading", { name: fixtureName, exact: true })).toBeVisible({
    timeout: 15000,
  });
  const path = new URL(page.url()).pathname;
  fixtureId = path.split("/").at(-1);
  const discussion = page.locator(".discussion");
  await discussion.getByLabel("Add a comment").fill("Owner project comment https://example.com");
  await discussion.getByRole("button", { name: "Post comment", exact: true }).click();
  await expect(discussion.locator(".comment-body")).toContainText("Owner project comment");
  await expect(
    discussion.getByRole("link", { name: "https://example.com", exact: true }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByRole("button", { name: /Creative/ }).click();
  await expect(page.locator(".stage-card")).toHaveCount(5);
  await page.getByLabel("Approved person", { exact: true }).selectOption(friendEmail);
  await page.getByRole("button", { name: "Create invitation link", exact: true }).click();
  const link = await page.getByLabel("Share this link privately").inputValue();
  const context = await browser.newContext();
  const friend = await context.newPage();
  await friend.goto("/");
  await clerk.signIn({ page: friend, emailAddress: friendEmail });
  await friend.goto(link);
  await friend.getByRole("button", { name: "Join this project", exact: true }).click();
  await expect(friend.getByRole("heading", { name: fixtureName, exact: true })).toBeVisible({
    timeout: 15000,
  });
  const node = `${path}?stage=imagine&node=inspiration`;
  await friend.goto(node);
  const friendDiscussion = friend.locator(".discussion");
  await expect(friendDiscussion.locator(".comment-item")).toHaveCount(0);
  await friendDiscussion.getByLabel("Add a comment").fill("Friend node comment");
  await friendDiscussion.getByRole("button", { name: "Post comment", exact: true }).click();
  await expect(friendDiscussion.locator(".comment-body")).toHaveText("Friend node comment");
  await friendDiscussion.getByRole("button", { name: "Comment actions", exact: true }).click();
  await friendDiscussion.getByRole("button", { name: "Edit comment", exact: true }).click();
  await expect(friendDiscussion.getByLabel("Edit comment", { exact: true })).toBeFocused();
  await friendDiscussion.getByLabel("Edit comment", { exact: true }).fill("Friend edited comment");
  await friendDiscussion.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(friendDiscussion.locator(".comment-body")).toHaveText("Friend edited comment");
  // Keep an older page open, then save a newer revision in a second tab.
  const second = await context.newPage();
  await second.goto(node);
  await friendDiscussion.getByRole("button", { name: "Comment actions", exact: true }).click();
  await friendDiscussion.getByRole("button", { name: "Edit comment", exact: true }).click();
  await friendDiscussion.getByLabel("Edit comment", { exact: true }).fill("Stale local draft");
  await second
    .locator(".discussion")
    .getByRole("button", { name: "Comment actions", exact: true })
    .click();
  await second
    .locator(".discussion")
    .getByRole("button", { name: "Edit comment", exact: true })
    .click();
  await second
    .locator(".discussion")
    .getByLabel("Edit comment", { exact: true })
    .fill("Newer saved version");
  await second
    .locator(".discussion")
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(second.locator(".comment-body")).toHaveText("Newer saved version");
  await friend.getByRole("button", { name: "Español", exact: true }).click();
  await expect(friend.locator("html")).toHaveAttribute("lang", "es");
  await friend.getByRole("button", { name: "English", exact: true }).click();
  await expect(friend.locator("html")).toHaveAttribute("lang", "en");
  await friendDiscussion.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(friendDiscussion.getByRole("alert")).toHaveText(
    "This comment changed. Reload before saving; your draft is still here.",
  );
  await expect(friendDiscussion.getByLabel("Edit comment", { exact: true })).toHaveValue(
    "Stale local draft",
  );
  await page.goto(node);
  await page
    .locator(".discussion")
    .getByRole("button", { name: "Comment actions", exact: true })
    .click();
  await expect(
    page.locator(".discussion").getByRole("button", { name: "Edit comment", exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".discussion")
    .getByRole("button", { name: "Remove comment", exact: true })
    .click();
  await page
    .locator(".discussion")
    .getByRole("button", { name: "Confirm removal", exact: true })
    .click();
  await expect(page.locator(".comment-item")).toContainText("Comment removed.");
  await page.locator(".project-activity summary").click();
  await expect(page.locator(".activity-list")).toContainText("moderated a comment");
  await expect(page.locator(".activity-list")).toContainText("edited a comment");
  await expect(page.locator(".activity-list")).not.toContainText("Newer saved version");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.locator(".discussion h2")).toContainText("Discusión");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto(path);
  await page.getByRole("button", { name: "Remove member", exact: true }).click();
  await friend.goto(node);
  await expect(
    friend.getByRole("heading", { name: "This project isn't available." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".activity-list")).toContainText("Former member");
  await context.unrouteAll({ behavior: "wait" });
  await context.close();
});
