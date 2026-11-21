import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { Pool } from "pg";
import { createHash, randomUUID } from "node:crypto";

test("a private image follows a business from the backlog into fullscreen, its dossier and the personal board", async ({
  page,
}) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const id = randomUUID(),
    name = "Photo workflow " + id;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwXsAAAAASUVORK5CYII=",
    "base64",
  );
  const hash = createHash("sha256").update(png).digest("hex");
  try {
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
    await page.goto("/prospects");
    const created = await page.request.put("/prospects/" + id, {
      data: { name, details: "Synthetic photo fixture" },
    });
    expect(created.status()).toBe(201);
    // Each fixture belongs to a randomly generated business in the configured browser-test database.
    await pool.query(
      "INSERT INTO prospect_image_files(catalogue_id,sha256,media_type,content) VALUES('business',$1,'image/png',$2) ON CONFLICT DO NOTHING",
      [hash, png],
    );
    await pool.query(
      "INSERT INTO prospect_image_refs(catalogue_id,prospect_id,sha256) VALUES('business',$1,$2)",
      [id, hash],
    );
    await page.goto("/prospects?q=" + encodeURIComponent(name));
    const table = page.getByRole("table", { name: "Business backlog" }),
      row = table.getByRole("row").filter({ hasText: name });
    const decoded = async () => {
      const image = page.locator('img[src*="' + hash + '"]').first();
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    };
    await expect(row).toBeVisible();
    await decoded();
    await page.getByRole("link", { name: "My board", exact: true }).click();
    await expect(page.getByRole("heading", { name: "0 businesses" })).toBeVisible();
    await page.getByRole("link", { name: "Backlog", exact: true }).click();
    await page.getByRole("link", { name: "Fullscreen", exact: true }).click();
    await decoded();
    await row.getByRole("link", { name, exact: true }).click();
    const gallery = page.getByRole("region", { name: "Business images" });
    await expect(gallery.getByRole("img", { name: name + " · image 1" })).toBeVisible();
    await decoded();
    const [original] = await Promise.all([
      page.waitForEvent("popup"),
      gallery.getByRole("link").first().click(),
    ]);
    await expect(original).toHaveURL(new RegExp(hash + "$"));
    await original.close();
    await page.getByRole("button", { name: "Add to Ready", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove from my board" })).toBeVisible();
    await page.locator("main > nav").getByRole("link").click();
    await expect(page.getByRole("link", { name: "Exit fullscreen" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "My board", exact: true }).click();
    const card = page
      .getByRole("region", { name: "Ready", exact: true })
      .getByRole("listitem")
      .filter({ hasText: name });
    await expect(card).toBeVisible();
    await decoded();
    await card.dragTo(page.getByRole("region", { name: "In progress", exact: true }), {
      sourcePosition: { x: 6, y: 5 },
      targetPosition: { x: 24, y: 65 },
    });
    const active = page
      .getByRole("region", { name: "In progress", exact: true })
      .getByRole("link", { name, exact: true });
    await expect(active).toBeVisible();
    await active.click();
    await page.getByLabel("Next action").fill("Call on Friday");
    await page.getByRole("button", { name: "Add to-do" }).click();
    await expect(page.getByText("Call on Friday", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove from my board" }).click();
    await expect(page.getByRole("button", { name: "Add to Ready" })).toBeVisible();
    await page.locator("main > nav").getByRole("link").click();
    await expect(page.getByRole("heading", { name: "0 businesses" })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("link", { name: "Backlog", exact: true }).click();
    await expect(row).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  } finally {
    await pool.query("DELETE FROM prospects WHERE id=$1 AND name=$2", [id, name]);
    await pool.query(
      "DELETE FROM prospect_image_files f WHERE f.catalogue_id='business' AND f.sha256=$1 AND NOT EXISTS(SELECT 1 FROM prospect_image_refs r WHERE r.catalogue_id=f.catalogue_id AND r.sha256=f.sha256)",
      [hash],
    );
    await pool.end();
  }
});
