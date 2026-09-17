import { expect, test } from "@playwright/test";

test("adult user completes onboarding and reaches the queue", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Doğum tarihi").fill("2000-01-01");
  await page.getByLabel("Topluluk kurallarını kabul ediyorum.").check();
  await page.getByRole("button", { name: "Devam et" }).click();

  await page.getByLabel("Takma ad").fill("Cemo");
  await page.getByLabel("İlgi alanları").fill("müzik, oyun");
  await page.getByRole("button", { name: "Tercihlere devam et" }).click();
  await page.getByRole("button", { name: "Kuyruğa hazırlan" }).click();

  await expect(page.getByRole("heading", { name: "Hazırsın, Cemo." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Eşleşme ara" })).toBeEnabled();
});
