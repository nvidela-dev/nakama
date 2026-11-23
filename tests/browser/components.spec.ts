import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
// Playwright runs the accessibility scan after each interaction; disable the competing automatic scan for these story URLs.
async function story(page: import("@playwright/test").Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=a11y.manual:!true`);
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
  await page.getByRole("tab", { name: "Project flow" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "To-do" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tabpanel")).toContainText("Plan the next small step.");
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
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
    "/iframe.html?id=features-guided-flows-type-picker--selectable&viewMode=story&globals=a11y.manual:!true;locale:es;density:compact",
  );
  await expect(page.getByRole("button", { name: /Investigación/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("progress fill remains concentric", async ({ page }) => {
  await story(page, "ui-progress-marker--partial");
  const offsets = await page.locator(".progress-marker").evaluate((element) => {
    const outer = element.getBoundingClientRect();
    const fill = element.querySelector(".progress-marker-fill")!.getBoundingClientRect();
    return {
      x: fill.left + fill.width / 2 - outer.left - outer.width / 2,
      y: fill.top + fill.height / 2 - outer.top - outer.height / 2,
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
  expect(animationName).toBe("pulse");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedAnimationName = await page
    .locator(".loading-bone")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(reducedAnimationName).toBe("none");
});

test("project cards show readable concentric progress with centered connectors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await story(page, "features-projects-project-timeline--compact-cards");
  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".project-card"));
    const card = cards[0]!;
    const placeholderCard = cards[1]!;
    const title = card.querySelector("h3")!;
    const firstItem = card.querySelector(".project-timeline li")!;
    const marker = firstItem.querySelector(".timeline-marker")!;
    const connector = getComputedStyle(firstItem.querySelector(".timeline-connector")!);
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
  expect(metrics.markerWidth).toBe(26);
  expect(metrics.markerHeight).toBe(26);
  expect(metrics.centerDeltaY).toBeLessThanOrEqual(0.5);
  expect(metrics.titleFontSize).toBeGreaterThanOrEqual(15);
  expect(metrics.cardHeight).toBeGreaterThanOrEqual(100);
  expect(metrics.cardHeight).toBeLessThan(160);
  expect(metrics.placeholderHeight).toBeLessThan(130);
  expect(metrics.overflow).toBe(false);

  const fills = await page
    .locator(".project-card")
    .first()
    .locator(".timeline-marker")
    .evaluateAll((markers) =>
      markers.map((marker) => {
        const style = getComputedStyle(marker);
        const fill = getComputedStyle(marker.querySelector(".progress-marker-fill")!);
        return {
          width: parseFloat(fill.width),
          available: marker.clientWidth,
          border: parseFloat(style.borderLeftWidth),
        };
      }),
    );
  expect(fills[0]!.width).toBeCloseTo(fills[0]!.available * 0.4, 0);
  expect(fills[0]!.width).toBeGreaterThanOrEqual(8);
  expect(fills[1]!.width).toBeCloseTo(fills[1]!.available, 0);
  expect(fills[2]!.width).toBe(0);

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
  expect(title.size).toBeGreaterThanOrEqual(15);
  expect(title.size).toBeLessThanOrEqual(16);
});

for (const id of [
  "ui-button--primary",
  "ui-form-controls--fields",
  "ui-feedback-and-surfaces--error",
  "ui-markdown--document",
  "features-guided-flows-type-picker--selectable",
  "features-projects-project-timeline--compact-cards",
]) {
  test(`Daylight palette has no serious accessibility violations: ${id}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=a11y.manual:!true;theme:day`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    const results = await new AxeBuilder({ page }).include("#storybook-root").analyze();
    expect(
      results.violations.filter((entry) => ["serious", "critical"].includes(entry.impact ?? "")),
    ).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`project setup preserves drafts after dismissal and rejected creation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await story(page, "features-projects-project-setup--draft");
    const trigger = page.getByRole("button", { name: "Open setup" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Choose later", exact: true }).click();
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByLabel("Project name", { exact: true }).fill("Synthetic draft");
    await dialog.getByLabel("Description", { exact: true }).fill("No external writes");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(dialog.getByLabel("Project name", { exact: true })).toHaveValue("Synthetic draft");
    await dialog.getByRole("button", { name: "Create project", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Preview only: your draft is still here.");
    await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue(
      "No external writes",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });
}

test("experiment lab preserves a review draft after a failed save and fits a phone", async ({
  page,
}) => {
  await story(page, "features-experiments-lab--evidence-review");
  await page.getByText("Review claim against evidence", { exact: true }).click();
  const rationale = page.getByLabel("Rationale, scope and remaining uncertainty", { exact: true });
  await rationale.fill("Three of five falls below the success criterion.");
  await page.getByRole("button", { name: "Record review", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preview only");
  await expect(rationale).toHaveValue("Three of five falls below the success criterion.");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).include("#storybook-root").analyze();
  expect(
    results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
  ).toEqual([]);
});
test("experiment lab starts with three required fields and exposes optional detail progressively", async ({
  page,
}) => {
  await story(page, "features-experiments-lab--empty");
  await expect(page.getByLabel("Baseline (if known)", { exact: true })).toBeHidden();
  await page
    .getByLabel("Claim · what do you want to learn?", { exact: true })
    .fill("A shorter form helps");
  await page
    .getByLabel("Method · how will you test it?", { exact: true })
    .fill("Observe a prototype");
  await page
    .getByLabel("Success criteria · what would count?", { exact: true })
    .fill("Four finish independently");
  await page.getByRole("button", { name: "Create iteration", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preview only");
  await expect(page.getByLabel("Claim · what do you want to learn?", { exact: true })).toHaveValue(
    "A shorter form helps",
  );
  await expect(page.getByLabel("Owner / responsible person", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Baseline (if known)", { exact: true })).toHaveCount(0);
});
test("experiment lab flags changed context and previews an explicitly scoped brief", async ({
  page,
}) => {
  await story(page, "features-experiments-lab--changed-context");
  await expect(
    page.getByText("Context changed · reconcile before accepting results or recording a review.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByText("Scoped agent brief", { exact: true }).click();
  await page.getByRole("button", { name: "Preview brief", exact: true }).click();
  await expect(page.getByLabel("Scoped brief", { exact: true })).toHaveValue(
    "Synthetic scoped brief. External execution only.",
  );
});

test("testing an existing idea opens an editable claim without inventing a method or criterion", async ({
  page,
}) => {
  await story(page, "features-experiments-lab--from-idea");
  const capture = page.getByRole("heading", { name: "Plan an iteration" }).locator("..");
  await expect(capture).toBeVisible();
  await expect(capture.locator('textarea[name="claim"]')).toHaveValue(
    "A shorter setup could help a new user finish independently.",
  );
  await expect(capture.locator('textarea[name="method"]')).toHaveValue("");
  await expect(capture.locator('textarea[name="criteria"]')).toHaveValue("");
  await expect(
    capture.getByText("Which user outcome or recurring-value assumption needs a test?"),
  ).toBeVisible();
  await capture.locator('textarea[name="claim"]').fill("Edited claim");
  await capture.locator('textarea[name="method"]').fill("Observe five sessions");
  await capture.locator('textarea[name="criteria"]').fill("Four complete independently");
  await page.getByRole("button", { name: "Create iteration", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft retained");
  await expect(capture.locator('textarea[name="claim"]')).toHaveValue("Edited claim");
});

test("workspace sidebar supports keyboard disclosure and retains form input", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await story(page, "ui-workspace-layout--project");
  const input = page.getByLabel("Email address");
  await input.fill("crew@example.com");
  await page.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(input).toBeHidden();
  await page.keyboard.press("Space");
  await expect(input).toHaveValue("crew@example.com");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("milestone edits cannot be dismissed or changed while saving and failures retain the draft", async ({
  page,
}) => {
  await story(page, "features-tasks-milestone-board--failed-save");
  await page.getByRole("button", { name: "New milestone", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New milestone", exact: true });
  await dialog.getByLabel("Milestone title", { exact: true }).fill("Keep this draft");
  await dialog.getByRole("button", { name: "Save milestone", exact: true }).click();
  await expect(dialog.getByLabel("Milestone title", { exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("Your draft is still here.");
  await expect(dialog.getByLabel("Milestone title", { exact: true })).toHaveValue(
    "Keep this draft",
  );
  await expect(page.getByTestId("operation-count")).toHaveText("1");
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "New milestone", exact: true })).toBeFocused();
});

for (const action of [
  "Complete milestone",
  "Archive milestone",
  "Delete milestone and keep tasks",
]) {
  test(`failed ${action} preserves the management dialog and reports the error`, async ({
    page,
  }) => {
    await story(page, "features-tasks-milestone-board--failed-save");
    await page
      .getByRole("combobox", { name: "Milestone board", exact: true })
      .selectOption("sprint");
    await page.getByRole("button", { name: "Manage milestone", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Manage milestone", exact: true });
    await dialog.getByRole("button", { name: action, exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toContainText("Your draft is still here.");
    await expect(page.getByTestId("operation-count")).toHaveText("1");
    await expect(page.getByTestId("last-operation")).toHaveText(
      action.startsWith("Delete") ? "milestone-delete:7" : "milestone-edit:7",
    );
  });
}

test("card moves support keyboard access and keep failed destinations available", async ({
  page,
}) => {
  await story(page, "features-tasks-milestone-board--failed-save");
  await page.getByRole("button", { name: "Card actions", exact: true }).focus();
  await page.keyboard.press("Enter");
  const move = page.getByRole("menuitem", { name: "Move card", exact: true });
  await expect(move).toBeVisible();
  await move.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Move card", exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("operation-count")).toHaveText("0");
  await dialog
    .getByRole("combobox", { name: "Destination board", exact: true })
    .selectOption("sprint");
  await dialog
    .getByRole("combobox", { name: "Destination column", exact: true })
    .selectOption("review");
  await dialog.getByRole("button", { name: "Confirm move", exact: true }).click();
  await expect(
    dialog.getByRole("combobox", { name: "Destination board", exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("Your draft is still here.");
  await expect(
    dialog.getByRole("combobox", { name: "Destination board", exact: true }),
  ).toHaveValue("sprint");
  await expect(
    dialog.getByRole("combobox", { name: "Destination column", exact: true }),
  ).toHaveValue("review");
  await expect(page.getByTestId("operation-count")).toHaveText("1");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Card actions", exact: true })).toBeFocused();
});

test("inline card saving locks the draft and board until the result is known", async ({ page }) => {
  await story(page, "features-tasks-milestone-board--failed-save");
  const ready = page.getByRole("region", { name: "Ready", exact: true });
  await ready.getByRole("button", { name: "Add card", exact: true }).click();
  const title = ready.getByRole("textbox", { name: "New card Ready", exact: true });
  await title.fill("Keep this card draft");
  await title.press("Enter");
  await expect(title).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "Milestone board", exact: true })).toBeDisabled();
  await expect(title).toBeEnabled();
  await expect(title).toHaveValue("Keep this card draft");
  await expect(page.getByTestId("operation-count")).toHaveText("1");
});

test("successful milestone creation closes once and restores focus", async ({ page }) => {
  await story(page, "features-tasks-milestone-board--successful-save");
  const trigger = page.getByRole("button", { name: "New milestone", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "New milestone", exact: true });
  await dialog.getByLabel("Milestone title", { exact: true }).fill("Saved milestone");
  await dialog.getByRole("button", { name: "Save milestone", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Save milestone", exact: true })).toBeDisabled();
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId("operation-count")).toHaveText("1");
});

for (const theme of ["day", "night"]) {
  test(`milestone board and editor fit narrow ${theme} layouts`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(
      `/iframe.html?id=features-tasks-milestone-board--failed-save&viewMode=story&globals=a11y.manual:!true;theme:${theme}`,
    );
    await expect(page.getByRole("button", { name: "New milestone", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole("button", { name: "New milestone", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "New milestone", exact: true });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    const results = await new AxeBuilder({ page }).include("dialog").analyze();
    expect(
      results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
    ).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`milestone-${theme}-320.png`) });
  });
}

test.describe("touch layout checks", () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 640 } });

  test("shared buttons and fields provide 44px touch targets", async ({ page }) => {
    await story(page, "ui-button--primary");
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    const primary = await page
      .getByRole("button", { name: "Save changes", exact: true })
      .boundingBox();
    expect.soft(primary!.height).toBeGreaterThanOrEqual(44);
    await story(page, "ui-button--small");
    const small = await page.getByRole("button", { name: "Go", exact: true }).boundingBox();
    expect.soft(small!.width).toBeGreaterThanOrEqual(44);
    expect.soft(small!.height).toBeGreaterThanOrEqual(44);
    await story(page, "ui-button--icon");
    const icon = await page
      .getByRole("button", { name: "Unread comments", exact: true })
      .boundingBox();
    expect.soft(icon!.width).toBeGreaterThanOrEqual(44);
    expect.soft(icon!.height).toBeGreaterThanOrEqual(44);
    await story(page, "ui-form-controls--fields");
    const input = await page
      .getByRole("textbox", { name: "Project name", exact: true })
      .boundingBox();
    const select = await page.getByRole("combobox", { name: "Status", exact: true }).boundingBox();
    expect.soft(input!.height).toBeGreaterThanOrEqual(44);
    expect.soft(select!.height).toBeGreaterThanOrEqual(44);
  });

  for (const [theme, locale] of [
    ["day", "en"],
    ["night", "en"],
    ["day", "es"],
    ["night", "es"],
  ]) {
    test(`task controls remain touchable and accessible in ${theme}/${locale}`, async ({
      page,
    }) => {
      await page.goto(
        `/iframe.html?id=features-tasks-milestone-board--failed-save&viewMode=story&globals=a11y.manual:!true;theme:${theme};locale:${locale}`,
      );
      const actions = page.getByRole("button", {
        name: locale === "es" ? "Acciones de la tarjeta" : "Card actions",
        exact: true,
      });
      await expect(actions).toBeVisible();
      const box = await actions.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await actions.tap();
      await expect(
        page.getByRole("menuitem", {
          name: locale === "es" ? "Mover tarjeta" : "Move card",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("menuitem", {
          name: locale === "es" ? "Mover tarjeta" : "Move card",
          exact: true,
        })
        .tap();
      const dialog = page.getByRole("dialog", {
        name: locale === "es" ? "Mover tarjeta" : "Move card",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      const cancel = dialog.getByRole("button", {
        name: locale === "es" ? "Cancelar" : "Cancel",
        exact: true,
      });
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const results = await new AxeBuilder({ page }).include("dialog").analyze();
      expect(
        results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
      ).toEqual([]);
      await page.screenshot({
        path: test.info().outputPath(`touch-move-${theme}-${locale}-320.png`),
      });
      await cancel.tap();
      await expect(dialog).not.toBeVisible();
      await expect(page.getByTestId("operation-count")).toHaveText("0");
    });
  }

  for (const [theme, locale] of [
    ["day", "en"],
    ["night", "en"],
    ["day", "es"],
    ["night", "es"],
  ]) {
    test(`workspace stories fit touch screens in ${theme}/${locale}`, async ({ page }) => {
      for (const id of [
        "features-guided-flows-type-picker--selectable",
        "features-projects-project-timeline--compact-cards",
        "features-experiments-lab--empty",
        "features-experiments-lab--changed-context",
      ]) {
        await page.goto(
          `/iframe.html?id=${id}&viewMode=story&globals=a11y.manual:!true;theme:${theme};locale:${locale}`,
        );
        await page.locator("#storybook-root > *").first().waitFor();
        if (id.includes("experiments-lab"))
          await page.screenshot({ path: test.info().outputPath(`${id}-${theme}-${locale}.png`) });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          id,
        ).toBe(true);
        const results = await new AxeBuilder({ page }).include("#storybook-root").analyze();
        expect(
          results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")),
          id,
        ).toEqual([]);
      }
    });
  }

  test("lab milestone labels remain separate from their counts at narrow widths", async ({
    page,
  }) => {
    for (const width of [320, 640, 1024]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(
        "/iframe.html?id=features-experiments-lab--changed-context&viewMode=story&globals=a11y.manual:!true;locale:es",
      );
      const milestones = page.getByRole("list", { name: "Hitos registrados", exact: true });
      await expect(milestones).toBeVisible();
      const labels = await milestones.locator("li").evaluateAll((items) =>
        items.map((item) => {
          const label = item.querySelector("strong")!;
          const range = document.createRange();
          range.selectNodeContents(label);
          return {
            label: label.textContent,
            labelRight: range.getBoundingClientRect().right,
            countLeft: item.lastElementChild!.getBoundingClientRect().left,
          };
        }),
      );
      await milestones.screenshot({ path: test.info().outputPath(`lab-milestones-${width}.png`) });
      for (const label of labels)
        expect
          .soft(label.labelRight, `${label.label} at ${width}px`)
          .toBeLessThanOrEqual(label.countLeft);
    }
  });

  test("milestone management stays scrollable on short landscape screens", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 320 });
    await story(page, "features-tasks-milestone-board--failed-save");
    await page
      .getByRole("combobox", { name: "Milestone board", exact: true })
      .selectOption("sprint");
    await page.getByRole("button", { name: "Manage milestone", exact: true }).tap();
    const dialog = page.getByRole("dialog", { name: "Manage milestone", exact: true });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(320);
    await dialog
      .getByRole("button", { name: "Delete milestone and keep tasks", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      dialog.getByRole("button", { name: "Delete milestone and keep tasks", exact: true }),
    ).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath("touch-management-landscape.png") });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).tap();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId("operation-count")).toHaveText("0");
  });
});

test("fine-pointer shared controls retain their compact sizing", async ({ page }) => {
  await story(page, "ui-button--primary");
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(false);
  expect(
    (await page.getByRole("button", { name: "Save changes", exact: true }).boundingBox())!.height,
  ).toBe(32);
  await story(page, "ui-button--small");
  const small = await page.getByRole("button", { name: "Go", exact: true }).boundingBox();
  expect(small!.width).toBeLessThan(44);
  expect(small!.height).toBe(24);
  await story(page, "ui-button--icon");
  const icon = await page
    .getByRole("button", { name: "Unread comments", exact: true })
    .boundingBox();
  expect(icon!.width).toBe(32);
  expect(icon!.height).toBe(32);
  await story(page, "ui-form-controls--fields");
  expect(
    (await page.getByRole("textbox", { name: "Project name", exact: true }).boundingBox())!.height,
  ).toBe(32);
  expect(
    (await page.getByRole("combobox", { name: "Status", exact: true }).boundingBox())!.height,
  ).toBe(32);
});

test("private prospect assessment keeps separate ratings and requires deliberate advancement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await story(page, "features-prospects-private-review--owner");
  await expect(
    page.getByLabel("What does the business sell, and what does its website do today?"),
  ).toHaveValue("Fixture notes");
  await expect(page.getByText("1 of 4 ratings entered")).toBeVisible();
  await expect(page.getByText(/Average:/)).toHaveCount(0);
  await page.getByLabel(/^Customer impact/).selectOption("3");
  await page.getByLabel(/^One-page offer fit/).selectOption("2");
  await page.getByLabel(/^Likelihood to pay/).selectOption("1");
  await expect(page.getByText(/Average: 2\.00 of 3/)).toBeVisible();
  const ready = page.getByRole("button", { name: "Mark Ready to call" });
  await expect(ready).toBeDisabled();
  await page.getByLabel("Assessment decision").selectOption("research");
  await page.getByRole("button", { name: "Save assessment" }).click();
  await expect(page.getByText("Assessment draft saved")).toBeVisible();
  await expect(ready).toBeDisabled();
  await page.getByLabel("Assessment decision").selectOption("ready");
  await ready.click();
  await expect(page.getByText("Moved deliberately")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("private prospect call debrief switches branches and saves or records the selected outcome", async ({
  page,
}) => {
  await story(page, "features-prospects-private-review--owner");
  const outcome = page.getByLabel("Call result");
  await expect(outcome).toHaveValue("voicemail");
  await expect(page.getByText("This logs an attempt without ratings.")).toBeVisible();
  await expect(page.getByLabel("Call date")).toHaveValue("2026-11-23");
  await outcome.selectOption("well");
  await expect(page.getByLabel("What clicked?")).toBeVisible();
  await expect(page.getByLabel(/^Interest/)).toBeVisible();
  await expect(page.getByLabel(/^Objection clarity/)).toHaveCount(0);
  await outcome.selectOption("poorly");
  await expect(page.getByLabel("Where did the call stall?")).toBeVisible();
  await expect(page.getByLabel(/^Recoverability/)).toBeVisible();
  await expect(page.getByLabel(/^Interest/)).toHaveCount(0);
  await page.getByLabel("Next action", { exact: true }).fill("Check Friday");
  await page.getByLabel("Due date").fill("2026-11-27");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Call draft saved")).toBeVisible();
  await expect(page.getByLabel("Next action", { exact: true })).toHaveValue("Check Friday");
  await outcome.selectOption("no_answer");
  await expect(page.getByText("This logs an attempt without ratings.")).toBeVisible();
  await expect(page.getByLabel(/^Recoverability/)).toHaveCount(0);
  await page.getByRole("button", { name: "Record call" }).click();
  await expect(page.getByText("Call recorded")).toBeVisible();
  await expect(outcome).toHaveValue("");
});

test("exact-name confirmation enables only a matching name", async ({ page }) => {
  await story(page, "ui-form-patterns--exact-name");
  const field = page.getByLabel("Enter Prototype to confirm"),
    submit = page.getByRole("button", { name: "Delete project" });
  await expect(submit).toBeDisabled();
  await field.fill("prototype");
  await expect(submit).toBeDisabled();
  await field.fill("Prototype");
  await submit.click();
  await expect(page.getByRole("status")).toHaveText("Confirmed");
});
test("artifact lightbox navigates images and restores focus", async ({ page }) => {
  await story(page, "artifacts-lightbox--keyboard-navigation");
  const trigger = page.getByRole("button", { name: "Open preview" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img", { name: "Small icon" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("img", { name: "Large icon" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
