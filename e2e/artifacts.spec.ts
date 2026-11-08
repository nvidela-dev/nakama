import { openProjectSetup } from "./project-setup";
import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import sharp from "sharp";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { projectService } from "../src/features/projects/server/projects";
import type { Database } from "../src/server/database/database";
let fixtureId: string | undefined;
const fixtureName = "E2E artifact workshop " + Date.now();
function connection() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const db: Database = {
    query: (q, v) => pool.query(q, v),
    transaction: async (work) => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN");
        const r = await work(tx);
        await tx.query("COMMIT");
        return r;
      } catch (e) {
        await tx.query("ROLLBACK");
        throw e;
      } finally {
        tx.release();
      }
    },
  };
  return { pool, db };
}
test.afterEach(async () => {
  if (!fixtureId) return;
  const { pool, db } = connection();
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
test("private artifact library, typed outputs, image lightbox, Markdown reader, tasks, conflicts and mobile", async ({
  page,
}) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(15000);
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  await page.goto("/projects");
  await openProjectSetup(page);
  await page.getByLabel("Project name", { exact: true }).fill(fixtureName);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Disposable artifact workshop verification.");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByRole("heading", { name: fixtureName, exact: true })).toBeVisible();
  fixtureId = new URL(page.url()).pathname.split("/").at(-1);
  await page.getByRole("button", { name: /Creative/ }).click();
  await page.getByRole("tab", { name: "Artifacts", exact: true }).click();
  await page.getByRole("button", { name: "New artifact", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Artifact name", { exact: true }).fill("Interface design");
  await dialog.getByLabel("Phase (optional)", { exact: true }).selectOption("imagine");
  await dialog.getByRole("button", { name: "Create artifact", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Interface design", exact: true })).toBeVisible();
  const imagePath = new URL(page.url()).pathname;
  await page.getByLabel("Artifact status", { exact: true }).selectOption("ready");
  await page.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(page.locator(".artifact-feedback [role=alert]")).toContainText(
    "Upload the required",
  );
  await page.getByLabel("Upload images", { exact: true }).setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator(".artifact-feedback [role=alert]")).toContainText("Choose a valid PNG");
  const png = await sharp({
    create: { width: 900, height: 600, channels: 3, background: "#5c7544" },
  })
    .png()
    .toBuffer();
  await page.getByLabel("Upload images", { exact: true }).setInputFiles([
    { name: "design-one.png", mimeType: "image/png", buffer: png },
    { name: "design-two.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(page.getByRole("button", { name: /Expand image:/ })).toHaveCount(2);
  await page.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(page.locator(".artifact-output .artifact-status")).toHaveText("Ready to use");
  await page.getByRole("button", { name: "Expand image: design-one.png", exact: true }).click();
  const lightbox = page.getByRole("dialog", { name: "Expanded image", exact: true });
  await expect(lightbox).toBeVisible();
  await page.getByRole("button", { name: "Next image", exact: true }).click();
  await expect(lightbox.getByAltText("design-two.png")).toBeVisible();
  await lightbox.screenshot({ path: test.info().outputPath("artifact-image-expanded.png") });
  await page.keyboard.press("Escape");
  await expect(lightbox).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expand image: design-one.png", exact: true }),
  ).toBeFocused();
  const imageSource = await page.locator(".artifact-image-button img").first().getAttribute("src");
  const response = await page.request.get(imageSource!);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["content-type"]).toBe("image/png");
  const forged = await page.request.get(imageSource!.replace(fixtureId!, randomUUID()));
  expect(forged.status()).toBe(404);
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task title 1", { exact: true }).fill("Review final composition");
  await page.getByLabel("Task status 1", { exact: true }).selectOption("done");
  await page.getByRole("button", { name: "Save tasks", exact: true }).click();
  await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Task title 1", { exact: true })).toHaveValue(
    "Review final composition",
  );
  await page.screenshot({
    path: test.info().outputPath("artifact-image-workspace.png"),
    fullPage: true,
  });
  await page.goto("/artifacts");
  await page.getByRole("button", { name: "New artifact", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project", { exact: true }).selectOption(fixtureId!);
  await dialog.getByLabel("Artifact name", { exact: true }).fill("Research plan");
  await dialog.getByLabel("Artifact type", { exact: true }).selectOption("markdown");
  await dialog.getByRole("button", { name: "Create artifact", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Research plan", exact: true })).toBeVisible();
  const markdownPath = new URL(page.url()).pathname;
  const md =
    "# Research plan\n\n## Evidence\n\n| Source | Finding |\n| --- | --- |\n| Trial | Promising |\n\n- [x] Review\n\n```js\nconst stage = 'draft';\n```\n\n<script>window.__artifactUnsafe=true</script>\n\n[Unsafe](javascript:alert(1))";
  await page.getByLabel("Upload / replace Markdown", { exact: true }).setInputFiles({
    name: "research-plan.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(md),
  });
  const reader = page.getByRole("article", { name: "Markdown reader" });
  await expect(reader.getByRole("heading", { name: "Research plan", exact: true })).toBeVisible();
  await expect(reader.locator("table")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __artifactUnsafe?: boolean }).__artifactUnsafe,
    ),
  ).toBeUndefined();
  await expect(reader.getByRole("link", { name: "Unsafe" })).toHaveCount(0);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Markdown", exact: true }).click();
  expect((await downloadEvent).suggestedFilename()).toBe("research-plan.md");
  await page.getByLabel("Artifact status", { exact: true }).selectOption("ready");
  await page.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(page.locator(".artifact-output .artifact-status")).toHaveText("Ready to use");
  const second = await page.context().newPage();
  await second.goto(markdownPath);
  await second.getByLabel("Artifact name", { exact: true }).fill("Other tab draft");
  await page.getByLabel("Artifact name", { exact: true }).fill("Revised research plan");
  await page.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(page.locator(".artifact-output > .artifact-library-heading h2")).toHaveText(
    "Revised research plan",
  );
  await second.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(second.locator(".artifact-feedback [role=alert]")).toContainText(
    "This artifact changed",
  );
  await expect(second.getByLabel("Artifact name", { exact: true })).toHaveValue("Other tab draft");
  await second
    .getByRole("button", { name: "Use latest version and keep my drafts", exact: true })
    .click();
  await second.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(second.locator(".artifact-output > .artifact-library-heading h2")).toHaveText(
    "Other tab draft",
  );
  await second.close();
  await page.goto("/artifacts");
  await page.getByRole("button", { name: "New artifact", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project", { exact: true }).selectOption(fixtureId!);
  await dialog.getByLabel("Artifact name", { exact: true }).fill("Product version one");
  await dialog.getByLabel("Artifact type", { exact: true }).selectOption("software");
  await dialog.getByRole("button", { name: "Create artifact", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Product version one", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("GitHub link", { exact: true })
    .fill("https://github.com/example/repository/releases/tag/v1");
  await page.getByLabel("Artifact status", { exact: true }).selectOption("ready");
  await page.getByRole("button", { name: "Save details", exact: true }).click();
  await expect(page.getByRole("link", { name: /Open on GitHub/ })).toHaveAttribute(
    "href",
    "https://github.com/example/repository/releases/tag/v1",
  );
  await page.goto("/artifacts");
  await page.getByLabel("Find an artifact", { exact: true }).fill("Interface design");
  await expect(page.locator(".artifact-card")).toHaveCount(1);
  await page.getByLabel("Find an artifact", { exact: true }).fill("");
  await page.getByLabel("Project", { exact: true }).selectOption(fixtureId!);
  await expect(page.locator(".artifact-card")).toHaveCount(3);
  await page.locator(".artifact-cover img").evaluateAll(async (imgs) => {
    await Promise.all(
      imgs.map(async (img) => {
        const image = img as HTMLImageElement;
        image.loading = "eager";
        await image.decode();
      }),
    );
  });
  expect(
    await page.locator(".artifact-cover img").evaluate((img) => {
      const image = img.getBoundingClientRect(),
        cover = img.parentElement!.getBoundingClientRect();
      return (
        Math.abs(image.height - cover.height) <= 1 &&
        cover.height === 180 &&
        image.bottom <= cover.bottom &&
        image.top >= cover.top
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("artifact-library-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: test.info().outputPath("artifact-library-phone.png") });
  await page
    .locator(".artifact-card")
    .last()
    .screenshot({ path: test.info().outputPath("artifact-image-card-phone.png") });
  await page.goto(imagePath);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole("button", { name: "Expand image: design-one.png", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Expanded image" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Espacio de artefacto", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Subir imágenes", { exact: true })).toBeVisible();
  await expect(page.locator(".artifact-output .artifact-status")).toHaveText("Listo para usar");
  await page.goto(markdownPath);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page
    .locator(".artifact-output")
    .screenshot({ path: test.info().outputPath("artifact-markdown-phone.png") });
  await page.getByText("Eliminar artefacto", { exact: true }).click();
  await page.getByLabel("Confirmar nombre del artefacto", { exact: true }).fill("Other tab draft");
  await page
    .getByRole("button", { name: "Eliminar artefacto permanentemente", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${fixtureId}\\?view=artifacts`));
});

test("shirt shop groups, four print areas, rotatable preview and physical printer handoff", async ({
  page,
}) => {
  test.setTimeout(210000);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.NAKAMA_ADMIN_EMAIL! });
  await page.goto("/projects");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.locator('button[value="shirt-eshop"]').click();
  await dialog.getByRole("button", { name: /Continue/ }).click();
  await dialog.getByLabel("Project name", { exact: true }).fill(fixtureName);
  await dialog
    .getByLabel("Description", { exact: true })
    .fill("Disposable shirt studio verification.");
  await dialog.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByRole("heading", { name: fixtureName, exact: true })).toBeVisible();
  fixtureId = new URL(page.url()).pathname.split("/").at(-1);
  await page.getByRole("tab", { name: "Artifacts", exact: true }).click();
  await page.getByRole("button", { name: "New artifact", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Artifact type")).toHaveValue("shirt");
  await dialog.getByLabel("Artifact name").fill("Field tee");
  await dialog.getByLabel("Collection").fill("Fieldwork");
  await dialog.getByRole("button", { name: "Create artifact", exact: true }).click();
  const studio = page.getByRole("region", { name: "Shirt studio", exact: true });
  await expect(studio).toBeVisible();
  await expect(
    studio.getByRole("img", { name: "Rotatable shirt preview" }).locator("canvas"),
  ).toBeVisible();
  const art = await sharp(
    Buffer.from(
      '<svg width="640" height="480"><rect x="30" y="40" width="180" height="380" fill="#e44024"/><circle cx="387" cy="220" r="140" fill="#18584c"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  await studio
    .getByLabel("Upload artwork")
    .setInputFiles({ name: "field.png", mimeType: "image/png", buffer: art });
  const tile = studio.getByRole("button", { name: "Place artwork field.png", exact: true });
  await expect(tile).toBeVisible();
  await tile.dragTo(studio.getByLabel("Print area preview"), { targetPosition: { x: 60, y: 60 } });
  await expect(studio.getByRole("button", { name: "Chest · 1" })).toBeVisible();
  for (const area of ["Back panel", "Left sleeve", "Right sleeve"]) {
    await studio.getByRole("button", { name: area + " · 0", exact: true }).click();
    await tile.click();
  }
  await studio.getByLabel("Blank and sample size").fill("Cotton crew, M");
  await studio.getByLabel("Printer notes").fill("Water-based print. Check sample before run.");
  await studio.getByRole("button", { name: "Save design", exact: true }).click();
  await expect(studio.getByRole("button", { name: "Download print pack" })).toBeEnabled();
  await page.reload();
  await expect(studio.getByRole("button", { name: "Left sleeve · 1", exact: true })).toBeVisible();
  await expect(studio.getByLabel("Blank and sample size")).toHaveValue("Cotton crew, M");
  const mesh = studio.getByRole("img", { name: "Rotatable shirt preview" }).locator("canvas");
  const box = await mesh.boundingBox();
  expect(box).toBeTruthy();
  const before = await mesh.screenshot();
  const x = box!.x + box!.width * 0.5,
    y = box!.y + box!.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y + 10, { steps: 10 });
  await page.mouse.up();
  expect(before.equals(await mesh.screenshot())).toBe(false);
  const downloaded = page.waitForEvent("download");
  await studio.getByRole("button", { name: "Download print pack" }).click();
  const { unzipSync } = await import("fflate"),
    { readFile } = await import("node:fs/promises");
  const packed = unzipSync(await readFile((await (await downloaded).path())!));
  const job = JSON.parse(Buffer.from(packed["job.json"]!).toString());
  expect(job.collection).toBe("Fieldwork");
  expect(job.layout.layers).toHaveLength(4);
  expect(Buffer.from(packed[job.files[0].path]!)).toEqual(art);
  for (const zone of ["chest", "back", "left_sleeve", "right_sleeve"]) {
    const png = sharp(packed["print/" + zone + ".png"]!);
    const info = await png.metadata();
    expect(info.density).toBe(300);
    expect(info.hasAlpha).toBe(true);
    expect(info.width).toBe(zone.endsWith("sleeve") ? 1181 : 3543);
    const stats = await png.stats();
    expect(stats.channels[3]!.min).toBe(0);
    expect(stats.channels[3]!.max).toBe(255);
  }
  await studio.screenshot({ path: test.info().outputPath("shirt-studio.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto("/projects/" + fixtureId + "?view=artifacts");
  await expect(page.getByRole("heading", { name: /Fieldwork/ })).toBeVisible();
  await page.goto("/projects");
  const card = page
    .getByRole("region", { name: "Shirt E-shop", exact: true })
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: fixtureName, exact: true }) });
  await expect(card).toContainText("1 design · 1 collection");
});
