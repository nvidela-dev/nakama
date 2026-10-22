import { test, expect, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
const ownerEmail =
  process.env.E2E_OWNER_EMAIL || "nakama-owner+clerk_test@example.com";
const friendEmail =
  process.env.E2E_FRIEND_EMAIL || "nakama-friend+clerk_test@example.com";
const outsiderEmail =
  process.env.E2E_OUTSIDER_EMAIL || "nakama-outsider+clerk_test@example.com";
async function signIn(page: Page, email: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/projects");
  await expect(
    page.getByRole("heading", { name: "Room for another what-if." }),
  ).toBeVisible();
}
test("private capture, invitation, guided editing, conflict, and removal on real development services", async ({
  browser,
  page,
}) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await signIn(page, ownerEmail);
  await expect(page.getByRole("button", { name: "Open user menu" })).toBeVisible();
  const name = `E2E radio play ${Date.now()}`;
  await page.getByLabel("Give your idea a name").fill(name);
  await page
    .getByLabel("What are you imagining?")
    .fill(
      "A small radio play made with friends. Automated development fixture.",
    );
  await page.getByRole("button", { name: "Give it a place to grow" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const projectPath = new URL(page.url()).pathname;
  await page.reload();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Creative \/ fun/ }).click();
  await expect(page.locator(".stage-card")).toHaveCount(5);
  await page.getByLabel("A friend's email").fill(friendEmail);
  await page.getByRole("button", { name: "Create invitation link" }).click();
  const inviteInput = page.getByLabel("Share this link privately");
  await expect(inviteInput).toBeVisible();
  const inviteLink = await inviteInput.inputValue();
  const friendContext = await browser.newContext();
  const friend = await friendContext.newPage();
  await signIn(friend, friendEmail);
  await friend.goto(projectPath);
  await expect(
    friend.getByRole("heading", { name: "This project isn't available." }),
  ).toBeVisible();
  await clerk.signOut({ page: friend });
  await friend.goto(inviteLink);
  await expect(
    friend.getByRole("button", { name: "Sign in to accept" }),
  ).toBeVisible();
  await clerk.signIn({ page: friend, emailAddress: friendEmail });
  await friend.getByRole("button", { name: "Join this project" }).click();
  await expect(
    friend.getByRole("heading", { name, exact: true }),
  ).toBeVisible();
  const nodePath = `${projectPath}?stage=imagine&node=inspiration`;
  await page.goto(nodePath);
  await friend.goto(nodePath);
  await page
    .getByLabel("Your answer, learning, or uncertainty")
    .fill("Warm voices and homemade sound effects.");
  await page.getByLabel("Where does this stand?").selectOption("answered");
  await page.getByRole("button", { name: "Save this step" }).click();
  await expect(
    page.getByText("Saved. A little more understood."),
  ).toBeVisible();
  await friend
    .getByLabel("Your answer, learning, or uncertainty")
    .fill("A friend’s different draft.");
  await friend.getByLabel("Where does this stand?").selectOption("answered");
  await friend.getByRole("button", { name: "Save this step" }).click();
  await expect(
    friend.getByRole("heading", { name: "A newer saved answer" }),
  ).toBeVisible();
  await expect(
    friend.getByLabel("Your answer, learning, or uncertainty"),
  ).toHaveValue("A friend’s different draft.");
  await friend
    .getByRole("button", { name: "I've compared; keep my draft" })
    .click();
  await friend.getByRole("button", { name: "Save this step" }).click();
  await expect(
    friend.getByText("Saved. A little more understood."),
  ).toBeVisible();
  await friend.reload();
  await expect(
    friend.getByLabel("Your answer, learning, or uncertainty"),
  ).toHaveValue("A friend’s different draft.");
  await page.goto(nodePath);
  await page.screenshot({
    path: test.info().outputPath("answer-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expect(
    page.getByLabel("Your answer, learning, or uncertainty"),
  ).toHaveValue("A friend’s different draft.");
  await page.screenshot({
    path: test.info().outputPath("answer-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await signIn(outsider, outsiderEmail);
  await outsider.goto(nodePath);
  await expect(
    outsider.getByRole("heading", { name: "This project isn't available." }),
  ).toBeVisible();
  await page.goto(projectPath);
  await page.getByLabel("A friend's email").fill(friendEmail);
  await page.getByRole("button", { name: "Create invitation link" }).click();
  await expect(page.getByLabel("Share this link privately")).toBeVisible();
  const olderUnusedInvite = await page
    .getByLabel("Share this link privately")
    .inputValue();
  await page
    .getByRole("button", { name: "Remove member", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove member", exact: true }),
  ).toHaveCount(0);
  await friend.reload();
  await expect(
    friend.getByRole("heading", { name: "This project isn't available." }),
  ).toBeVisible();
  await friend.goto(olderUnusedInvite);
  await friend.getByRole("button", { name: "Join this project" }).click();
  await expect(friend.locator(".message.error")).toContainText("unavailable");
  await friendContext.close();
  await outsiderContext.close();
});
