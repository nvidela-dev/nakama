import {openProjectSetup} from "./project-setup";
import { test, expect, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
async function density(page: Page, value: "compact" | "comfortable") {
  await page.getByLabel("Desktop layout").selectOption(value);
  await expect(page.locator("html")).toHaveAttribute("data-density", value);
}
test("desktop and ultrawide use compact full-width rows; comfortable and phone retain roomier cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/preview");
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  const compact = await page.locator(".stage-card").first().boundingBox();
  expect(compact!.height).toBeLessThan(80);
  await page.screenshot({
    path: test.info().outputPath("desktop-compact.png"),
    fullPage: true,
  });
  await density(page, "comfortable");
  const comfortable = await page.locator(".stage-card").first().boundingBox();
  expect(comfortable!.height).toBeGreaterThan(compact!.height * 1.5);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-density",
    "comfortable",
  );
  await density(page, "compact");
  await page.setViewportSize({ width: 3440, height: 1440 });
  const workspace = await page.locator(".workspace").boundingBox();
  expect(workspace!.width).toBe(3440);
  const last = await page.locator(".stage-card").last().boundingBox();
  expect(last!.y + last!.height).toBeLessThan(800);
  await page.screenshot({
    path: test.info().outputPath("ultrawide-overview.png"),
    fullPage: true,
  });
  await page.locator(".stage-card").filter({ hasText: "Imagine" }).click();
  await expect(
    page.locator(".tree-row").first().locator(".question-node"),
  ).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: test.info().outputPath("ultrawide-branches.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Desktop layout")).toBeHidden();
  await page.goto("/preview");
  expect(
    await page
      .locator(".stage-card")
      .first()
      .evaluate((el) => getComputedStyle(el).paddingTop),
  ).toBe("24px");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: test.info().outputPath("phone-unchanged.png"),
    fullPage: true,
  });
});
test("density changes keep capture and answer drafts, selections and saving intact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await clerk.signIn({
    page,
    emailAddress:
      process.env.E2E_OWNER_EMAIL || "nakama-owner+clerk_test@example.com",
  });
  await page.goto("/projects");
  const name = `E2E compact ${Date.now()}`;
  await openProjectSetup(page);
  await page.getByLabel("Project name").fill(name);
  await page.getByLabel("Description").fill("A compact desktop workspace.");
  await page.getByRole("button",{name:"Close setup",exact:true}).click();
  await density(page, "comfortable");
  await openProjectSetup(page);
  await expect(page.getByLabel("Project name")).toHaveValue(name);
  await page.getByRole("button",{name:"Close setup",exact:true}).click();
  await density(page, "compact");
  await openProjectSetup(page);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Creative/ }).click();
  await expect(page.locator(".stage-card")).toHaveCount(5);
  const project = new URL(page.url()).pathname;
  await page.goto(`${project}?stage=experiment&node=experiment-direction`);
  await page
    .getByLabel("Your answer, learning, or uncertainty")
    .fill("Keep this draft across desktop layouts.");
  await page.getByLabel("Your direction").selectOption("Save for later");
  await density(page, "comfortable");
  await expect(
    page.getByLabel("Your answer, learning, or uncertainty"),
  ).toHaveValue("Keep this draft across desktop layouts.");
  await density(page, "compact");
  await expect(page.getByLabel("Your direction")).toHaveValue("Save for later");
  const answer = await page
    .getByLabel("Your answer, learning, or uncertainty")
    .boundingBox();
  const state = await page.getByLabel("Where does this stand?").boundingBox();
  expect(state!.x).toBeGreaterThan(answer!.x + answer!.width);
  await page.screenshot({
    path: test.info().outputPath("desktop-answer.png"),
    fullPage: true,
  });
  await page.getByLabel("Where does this stand?").selectOption("answered");
  await page.getByRole("button", { name: "Save this step" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Your answer, learning, or uncertainty"),
  ).toHaveValue("Keep this draft across desktop layouts.");
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByLabel("Vista de escritorio")).toHaveValue("compact");
});
