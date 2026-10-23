import {openProjectSetup} from "./project-setup";
import { test, expect, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
async function language(page: Page, code: "en" | "es") {
  await page
    .getByRole("button", {
      name: code === "es" ? "Español" : "English",
      exact: true,
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", code);
  await expect(
    page.getByRole("button", {
      name: code === "es" ? "Español" : "English",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
}

test("language switches persist across routes and reload, including Clerk and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await language(page, "es");
  await expect(
    page.getByRole("heading", {
      name: "Desarrollá proyectos con tu equipo.",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.getByRole("link", { name: "Proyecto de ejemplo" }).click();
  await expect(
    page.getByRole("heading", { name: "Proyecto de producción de audio" }),
  ).toBeVisible();
  await page.locator(".stage-card").filter({ hasText: "Imaginar" }).click();
  await page
    .locator(".question-node")
    .filter({ has: page.getByText("Inspiración", { exact: true }) })
    .click();
  await expect(
    page.getByRole("heading", { name: "¿Qué nos inspira?" }),
  ).toBeVisible();
  const route = page.url();
  await language(page, "en");
  await expect(
    page.getByRole("heading", { name: "What inspires us?" }),
  ).toBeVisible();
  expect(page.url()).toBe(route);
  await language(page, "es");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: test.info().outputPath("spanish-mobile.png"),
    fullPage: true,
  });
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", {
      name: /Inicia sesión|Iniciá sesión|Iniciar sesión/,
    }),
  ).toBeVisible();
  await language(page, "en");
  await expect(page.getByRole("heading", { name: /Sign in to/ })).toBeVisible();
});

test("switching languages preserves drafts, stored content, canonical decisions and feedback", async ({
  page,
}) => {
  await page.goto("/");
  await clerk.signIn({
    page,
    emailAddress:
      process.env.E2E_OWNER_EMAIL || "nakama-owner+clerk_test@example.com",
  });
  await page.goto("/projects");
  const name = `E2E idiomas ${Date.now()}`;
  await openProjectSetup(page);
  await page.getByLabel("Project name").fill(name);
  await page.getByLabel("Description").fill("What inspires us?");
  await page.getByRole("button",{name:"Close setup",exact:true}).click();
  await language(page, "es");
  await openProjectSetup(page);
  await expect(page.getByLabel("Nombre del proyecto")).toHaveValue(name);
  await expect(page.getByLabel("Descripción")).toHaveValue("What inspires us?");
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.locator(".page-heading p")).toHaveText("What inspires us?");
  await page.getByRole("button", { name: /Creativo/ }).click();
  await expect(page.locator(".stage-card")).toHaveCount(5);
  const project = new URL(page.url()).pathname;
  await page.goto(`${project}?stage=experiment&node=experiment-direction`);
  await page
    .getByLabel("Tu respuesta, aprendizaje o duda")
    .fill("Mi borrador stays exactly as typed.");
  await page.getByLabel("Tu rumbo").selectOption("Save for later");
  await language(page, "en");
  await expect(
    page.getByLabel("Your answer, learning, or uncertainty"),
  ).toHaveValue("Mi borrador stays exactly as typed.");
  await expect(page.getByLabel("Your direction")).toHaveValue("Save for later");
  await language(page, "es");
  await page.getByLabel("¿En qué estado está?").selectOption("answered");
  await page.getByRole("button", { name: "Guardar este paso" }).click();
  await expect(page).toHaveURL(`${project}?stage=experiment`);
  await expect(page.locator(".node-tree")).toBeVisible();
  await page.goto(`${project}?stage=experiment&node=experiment-direction`);
  await expect(page.getByLabel("Tu respuesta, aprendizaje o duda")).toHaveValue(
    "Mi borrador stays exactly as typed.",
  );
  await expect(page.getByLabel("Tu rumbo")).toHaveValue("Save for later");
  await expect(page.locator(".journey-summary")).toContainText("en pausa");
  await page.getByLabel("Tu respuesta, aprendizaje o duda").fill("");
  await page.getByRole("button", { name: "Guardar este paso" }).click();
  await expect(
    page.getByText(
      "Registrá una respuesta, duda o motivo antes de elegir este estado.",
    ),
  ).toBeVisible();
  await language(page, "en");
  await expect(
    page.getByText(
      "Record an answer, uncertainty, or reason before choosing this state.",
    ),
  ).toBeVisible();
});
