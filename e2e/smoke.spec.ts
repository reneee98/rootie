import { test, expect } from "@playwright/test";

const PREDAJCA_EMAIL = process.env.E2E_PREDAJCA_EMAIL ?? "predajca@test.rootie.sk";
const PREDAJCA_PASSWORD = process.env.E2E_PREDAJCA_PASSWORD ?? "test1234";
const KUPUJUCI_EMAIL = process.env.E2E_KUPUJUCI_EMAIL ?? "kupujuci@test.rootie.sk";
const KUPUJUCI_PASSWORD = process.env.E2E_KUPUJUCI_PASSWORD ?? "test1234";
const DRUHY_EMAIL = process.env.E2E_DRUHY_EMAIL ?? "druhy@test.rootie.sk";
const DRUHY_PASSWORD = process.env.E2E_DRUHY_PASSWORD ?? "test1234";

test.describe("Smoke flow", () => {
  test.setTimeout(120_000);
  test("create listing, start chat, send message, create wanted, send offer", async ({
    page,
  }) => {
    await test.step("Login as seller (predajca)", async () => {
      await page.goto("/login");
      await page.getByPlaceholder("vas@email.sk").fill(PREDAJCA_EMAIL);
      await page.getByPlaceholder("••••••••").fill(PREDAJCA_PASSWORD);
      await page.getByRole("button", { name: "Prihlásiť sa" }).click();
      await expect(page).toHaveURL(/\/(me|$)/);
    });

    await test.step("Create listing", async () => {
      await page.goto("/create");
      await expect(
        page.getByRole("heading", { name: "Nový inzerát" })
      ).toBeVisible();

      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.locator('input[type="file"]').first().setInputFiles("e2e/fixtures/test-image.png");
      await expect(page.getByText(/1\/10 fotiek/)).toBeVisible();
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.getByLabel(/Názov rastliny/i).fill("E2E test Monstera");
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.getByLabel(/Kraj/i).selectOption({ index: 1 });
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.getByLabel(/Cena/).fill("5");
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.getByRole("button", { name: "Zverejniť inzerát" }).click();
      await expect(page).toHaveURL(/\/listing\/[a-f0-9-]+/);
    });

    const listingUrl = page.url();

    await test.step("Logout and login as buyer (kupujuci)", async () => {
      await page.goto("/me");
      await page.getByRole("button", { name: "Odhlásiť sa" }).click();
      await page.goto("/login");
      await page.getByPlaceholder("vas@email.sk").fill(KUPUJUCI_EMAIL);
      await page.getByPlaceholder("••••••••").fill(KUPUJUCI_PASSWORD);
      await page.getByRole("button", { name: "Prihlásiť sa" }).click();
      await expect(page).toHaveURL(/\/(me|$)/);
    });

    await test.step("Open listing and start chat", async () => {
      await page.goto(listingUrl);
      await page.getByRole("link", { name: "Poslať ponuku", exact: true }).click();
      await expect(page).toHaveURL(/\/listing\/[a-f0-9-]+\/offer/);
      await page.getByLabel("Suma (€)").fill("5");
      await page.getByRole("button", { name: "Odoslať ponuku", exact: true }).click();
      await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/);
    });

    await test.step("Send message", async () => {
      await page.getByPlaceholder(/Napíšte správu/).fill("E2E test správa");
      await page.getByRole("button", { name: "Odoslať" }).click();
      await expect(page.getByText("E2E test správa")).toBeVisible({ timeout: 5000 });
    });

    await test.step("Send message with attachment", async () => {
      await page.getByRole("button", { name: "Pridať obrázok" }).click();
      await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/test-image.png");
      await expect(page.getByRole("button", { name: "Odstrániť", exact: true }).first()).toBeVisible();
      await page.getByPlaceholder(/Napíšte správu/).fill("E2E správa s obrázkom");
      await page.getByRole("button", { name: "Odoslať" }).click();
      await expect(page.getByText("E2E správa s obrázkom")).toBeVisible({ timeout: 5000 });
    });

    await test.step("Create wanted", async () => {
      await page.goto("/wanted/create");
      await page.getByLabel("Názov rastliny", { exact: true }).fill("E2E Hľadám Fikus");
      await page.getByLabel(/Kraj/i).selectOption({ index: 1 });
      await page.getByRole("button", { name: /Vytvoriť požiadavku|Vytvoriť/ }).click();
      await expect(page).toHaveURL(/\/wanted\/[a-f0-9-]+/);
    });

    const wantedUrl = page.url();

    await test.step("Logout and login as second user (druhy)", async () => {
      await page.goto("/me");
      await page.getByRole("button", { name: "Odhlásiť sa" }).click();
      await page.goto("/login");
      await page.getByPlaceholder("vas@email.sk").fill(DRUHY_EMAIL);
      await page.getByPlaceholder("••••••••").fill(DRUHY_PASSWORD);
      await page.getByRole("button", { name: "Prihlásiť sa" }).click();
    });

    await test.step("Open wanted and send offer", async () => {
      await page.goto(wantedUrl);
      await page.getByRole("link", { name: /Poslať ponuku/ }).click();
      await expect(page).toHaveURL(/\/wanted\/[a-f0-9-]+\/offer/);
      await page.getByRole("radio", { name: /Ponuka výmeny/ }).click();
      await page.getByPlaceholder(/Monstera|odnož/).fill("E2E ponuka na wanted");
      await page.getByRole("button", { name: /Odoslať ponuku/ }).click();
      await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/);
      await expect(page.getByText("E2E ponuka na wanted")).toBeVisible({ timeout: 5000 });
    });
  });
});
