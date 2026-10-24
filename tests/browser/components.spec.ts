import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function story(page: import("@playwright/test").Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  await page.locator("#storybook-root").waitFor();
}
test("dialog traps focus, closes with Escape and restores its trigger", async ({ page }) => {
  await story(page, "ui-dialog--interactive");
  const trigger = page.getByRole("button", { name: "Open dialog" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Create a project" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Project name")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Close dialog" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("tab keyboard navigation preserves drafts in inactive panels", async ({ page }) => {
  await story(page, "ui-tabs--persistent-panels");
  await page.getByLabel("Draft").fill("Keep this draft");
  await page.getByRole("tab", { name: "Project steps" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "To-do" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Plan the next small step.");
  await page.keyboard.press("Home");
  await expect(page.getByLabel("Draft")).toHaveValue("Keep this draft");
});
for (const id of [
  "ui-button--primary",
  "ui-button--pending",
  "ui-form-controls--fields",
  "ui-form-controls--invalid",
  "ui-feedback-and-surfaces--empty",
  "ui-feedback-and-surfaces--error",
  "ui-loading--skeleton",
  "ui-loading--cards",
  "ui-loading--workspace",
  "ui-loading--compact",
  "ui-loading--map-skeleton",
  "ui-progress-marker--partial",
  "ui-markdown--document",
  "features-guided-flows-type-picker--selectable",
  "features-projects-project-timeline--compact-cards",
]) {
  test(`no serious accessibility violations: ${id}`, async ({ page }) => {
    await story(page, id);
    await page.locator("#storybook-root").locator("> *").first().waitFor();
    const results = await new AxeBuilder({ page }).include("#storybook-root").analyze();
    expect(
      results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
    ).toEqual([]);
  });
}
test("the workflow picker stays compact on a phone and supports Spanish", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/iframe.html?id=features-guided-flows-type-picker--selectable&viewMode=story&globals=locale:es;density:compact",
  );
  await expect(page.getByRole("button", { name: /Investigación/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("progress fill remains concentric", async ({ page }) => {
  await story(page, "ui-progress-marker--partial");
  const offsets = await page.locator(".progress-marker").evaluate((element) => {
    const parent = getComputedStyle(element),
      fill = getComputedStyle(element, "::before"),
      matrix = new DOMMatrix(fill.transform);
    return {
      x:
        parseFloat(parent.borderLeftWidth) +
        parseFloat(fill.left) +
        parseFloat(fill.width) / 2 +
        matrix.m41 -
        element.getBoundingClientRect().width / 2,
      y:
        parseFloat(parent.borderTopWidth) +
        parseFloat(fill.top) +
        parseFloat(fill.height) / 2 +
        matrix.m42 -
        element.getBoundingClientRect().height / 2,
    };
  });
  expect(Math.abs(offsets.x)).toBeLessThan(0.1);
  expect(Math.abs(offsets.y)).toBeLessThan(0.1);
});

test("conversation actions open by keyboard, dismiss with Escape/outside click and close after selection", async ({
  page,
}) => {
  await story(page, "collaboration-conversation--messages");
  const trigger = page.getByRole("button", { name: "Comment actions", exact: true });
  const edit = page.getByRole("button", { name: "Edit comment", exact: true });
  await expect(edit).not.toBeVisible();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(edit).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(edit).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(edit).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("heading", { name: "Discussion", exact: true }).click();
  await expect(edit).not.toBeVisible();
  await trigger.click();
  await edit.click();
  await expect(page.getByRole("status")).toHaveText("Edit comment");
  await expect(edit).not.toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
  const results = await new AxeBuilder({ page }).include("#storybook-root").analyze();
  expect(
    results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
  ).toEqual([]);
});

for (const example of ["stacked", "with-direction"]) {
  test(`answer uses the full width with status underneath: ${example}`, async ({ page }) => {
    await story(page, `features-guided-flows-answer-fields--${example}`);
    const answer = page.getByRole("textbox", { name: "Your answer, learning, or uncertainty" });
    await expect(answer).toBeEnabled();
    await answer.fill("Keep this answer while resizing");
    for (const density of ["compact", "comfortable"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.density = value;
      }, density);
      for (const width of [390, 1024, 1280, 1440, 1900]) {
        await page.setViewportSize({ width, height: 900 });
        for (const panelWidth of [260, 560]) {
          await page.locator(".answer-panel").evaluate((element, value) => {
            (element as HTMLElement).style.width = `${value}px`;
            (element as HTMLElement).style.maxWidth = "100%";
          }, panelWidth);
          const form = await page.locator(".answer-form").boundingBox();
          const area = await answer.boundingBox();
          const status = await page
            .getByLabel("Where does this stand?", { exact: true })
            .boundingBox();
          expect(area!.width).toBeGreaterThanOrEqual(form!.width - 2);
          expect(status!.y).toBeGreaterThan(area!.y + area!.height);
          expect(status!.width).toBeLessThanOrEqual(form!.width + 1);
          await expect(answer).toHaveValue("Keep this answer while resizing");
          expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
            false,
          );
        }
      }
    }
  });
}

test("chat reference picker searches, recovers from errors, inserts named links and dismisses with Escape", async ({
  page,
}) => {
  await story(page, "collaboration-reference-picker--search-and-insert");
  const trigger = page.getByRole("button", { name: "Link a project or artifact", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Link a project or artifact", exact: true });
  const search = dialog.getByLabel("Search projects and artifacts");
  await expect(search).toBeFocused();
  await expect(dialog.getByRole("button", { name: /Example project Project/ })).toBeVisible();
  await search.fill("error");
  await expect(dialog.getByRole("alert")).toHaveText("Could not load references.");
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Could not load references.");
  await search.fill("no-match");
  await expect(dialog).toContainText("No matching projects or artifacts.");
  await search.fill("design");
  await expect(dialog.getByRole("button", { name: /Example project Project/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: /Design draft Artifact/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".comment-body")).toContainText("Keep this draft.");
  await expect(page.getByRole("link", { name: "Design draft", exact: true })).toHaveAttribute(
    "href",
    "/projects/00000000-0000-4000-8000-000000000001/artifacts/00000000-0000-4000-8000-000000000002",
  );
  await page.setViewportSize({ width: 390, height: 700 });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Example project Project/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const accessibility = await new AxeBuilder({ page }).include("#storybook-root").analyze();
  expect(
    accessibility.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("the real chat composer inserts a reference at the selected text and retains a rejected over-limit draft", async ({
  page,
}) => {
  await story(page, "collaboration-reference-picker--composer");
  const draft = page.getByRole("textbox", { name: "Add a comment", exact: true });
  await expect(draft).toBeEnabled();
  await draft.fill("Before selected after");
  await draft.evaluate((element) => {
    (element as HTMLTextAreaElement).setSelectionRange(7, 15);
  });
  const open = page.getByRole("button", { name: "Link a project or artifact", exact: true });
  await open.click();
  await page.getByRole("dialog").getByLabel("Search projects and artifacts").press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(draft).toHaveValue("Before selected after");
  await page.getByRole("button", { name: /Design draft Artifact/ }).click();
  await expect(draft).toHaveValue(
    "Before [Design draft](/projects/00000000-0000-4000-8000-000000000001/artifacts/00000000-0000-4000-8000-000000000002) after",
  );
  await expect(draft).toBeFocused();
  await page.getByRole("button", { name: "Post comment", exact: true }).click();
  await expect(page.getByRole("link", { name: "Design draft", exact: true })).toBeVisible();
  await expect(draft).toHaveValue("");
  await draft.fill("x".repeat(3999));
  await open.click();
  await page.getByRole("button", { name: /Design draft Artifact/ }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "This link would exceed the comment limit. Shorten your draft first.",
  );
  await expect(draft).toHaveValue("x".repeat(3999));
  await page.setViewportSize({ width: 390, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("loading skeletons render animated bones and respect reduced motion", async ({ page }) => {
  await story(page, "ui-loading--cards");
  const status = page.getByRole("status");
  await expect(status).toHaveAttribute("aria-busy", "true");
  await expect(status).toHaveText("Loading projects…");
  await expect(page.locator(".loading-placeholder")).toHaveCount(4);
  const boneCount = await page.locator(".loading-bone").count();
  expect(boneCount).toBeGreaterThanOrEqual(44);
  const animationName = await page
    .locator(".loading-bone")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName).toBe("loading-shimmer");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedAnimationName = await page
    .locator(".loading-bone")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(reducedAnimationName).toBe("none");
});

test("project cards and timeline dots stay compact with centered connectors", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await story(page, "features-projects-project-timeline--compact-cards");
  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".project-card"));
    const card = cards[0]!;
    const placeholderCard = cards[1]!;
    const title = card.querySelector("h3")!;
    const firstItem = card.querySelector(".project-timeline li")!;
    const marker = firstItem.querySelector(".timeline-marker")!;
    const connector = getComputedStyle(firstItem, "::before");
    const markerBox = marker.getBoundingClientRect();
    const itemBox = firstItem.getBoundingClientRect();
    const connectorCenterY =
      itemBox.top + parseFloat(connector.top) + parseFloat(connector.height) / 2;
    const markerCenterY = markerBox.top + markerBox.height / 2;
    return {
      cardHeight: card.getBoundingClientRect().height,
      placeholderHeight: placeholderCard
        .querySelector(".project-card-link")!
        .getBoundingClientRect().height,
      titleFontSize: parseFloat(getComputedStyle(title).fontSize),
      markerWidth: markerBox.width,
      markerHeight: markerBox.height,
      centerDeltaY: Math.abs(connectorCenterY - markerCenterY),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(metrics.markerWidth).toBe(11);
  expect(metrics.markerHeight).toBe(11);
  expect(metrics.centerDeltaY).toBeLessThanOrEqual(0.5);
  expect(metrics.titleFontSize).toBeLessThanOrEqual(15);
  expect(metrics.cardHeight).toBeLessThan(92);
  expect(metrics.placeholderHeight).toBeLessThan(68);
  expect(metrics.overflow).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("project card actions stay hidden behind a chevron until opened", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await story(page, "features-projects-project-timeline--compact-cards");
  const card = page.locator(".project-card").first();
  const trigger = card.getByRole("button", { name: "Project actions", exact: true });
  const edit = card.getByRole("button", { name: "Edit project", exact: true });
  await expect(edit).not.toBeVisible();
  await expect(card.getByRole("button", { name: "Delete project", exact: true })).not.toBeVisible();
  await trigger.click();
  await expect(edit).toBeVisible();
  const [menu, nextCard] = await Promise.all([
    card.locator(".ui-action-menu-items").boundingBox(),
    page.locator(".project-card").nth(1).boundingBox(),
  ]);
  expect(menu!.width).toBeGreaterThan(100);
  expect(nextCard).not.toBeNull();
  const topElement = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest(".ui-action-menu-items") !== null,
    { x: menu!.x + menu!.width / 2, y: menu!.y + menu!.height - 4 },
  );
  expect(topElement).toBe(true);
  await page.keyboard.press("Escape");
  await expect(edit).not.toBeVisible();
  await expect(trigger).toBeFocused();
  const title = await card.locator("h3").evaluate((el) => {
    const style = getComputedStyle(el);
    return { top: parseFloat(style.paddingTop), size: parseFloat(style.fontSize) };
  });
  expect(title.top).toBeGreaterThanOrEqual(4);
  expect(title.size).toBeLessThanOrEqual(14);
});

for (const id of [
  "ui-button--primary",
  "ui-form-controls--fields",
  "ui-feedback-and-surfaces--error",
  "ui-markdown--document",
  "features-guided-flows-type-picker--selectable",
  "features-projects-project-timeline--compact-cards",
]) {
  test(`Zen palette has no serious accessibility violations: ${id}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:zen`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "zen");
    const results = await new AxeBuilder({ page }).include("#storybook-root").analyze();
    expect(
      results.violations.filter((entry) => ["serious", "critical"].includes(entry.impact ?? "")),
    ).toEqual([]);
  });
}
