import {expect,type Page} from "@playwright/test";
// Existing journeys can defer a flow and continue exercising selection later.
export async function openProjectSetup(page:Page) {
  await page.getByRole("button",{name:/^(New project|Nuevo proyecto)(\s*\+)?$/}).click();
  const dialog=page.getByRole("dialog");
  if(await dialog.getByRole("button",{name:/^(Choose later|Elegir más adelante)$/}).count()){
    await dialog.getByRole("button",{name:/^(Choose later|Elegir más adelante)$/}).click();
    await dialog.getByRole("button",{name:/^(Continue|Continuar)/}).click();
  }
  await expect(dialog.locator('input[name="name"]')).toBeVisible();
}
