import { test, expect } from "@playwright/test";

/**
 * Testovací účty: spusti predtým `npm run seed:users` (predajca, kupujuci, druhy).
 * Overuje, že chat funguje obojsmerne – obe strany vidia správy druhej.
 */
const PREDAJCA_EMAIL = process.env.E2E_PREDAJCA_EMAIL ?? "predajca@test.rootie.sk";
const PREDAJCA_PASSWORD = process.env.E2E_PREDAJCA_PASSWORD ?? "test1234";
const KUPUJUCI_EMAIL = process.env.E2E_KUPUJUCI_EMAIL ?? "kupujuci@test.rootie.sk";
const KUPUJUCI_PASSWORD = process.env.E2E_KUPUJUCI_PASSWORD ?? "test1234";

const MSG_FROM_BUYER = "Toto píše kupujúci – chcem kúpiť.";
const MSG_FROM_SELLER = "Toto píše predajca – v poriadku, dohodneme sa.";

test.describe("Chat – viditeľnosť správ medzi dvoma používateľmi", () => {
  test.setTimeout(120_000);

  test("predajca a kupujúci vidia navzájom svoje správy v konverzácii", async ({
    page,
  }) => {
    await test.step("Prihlásenie ako predajca a vytvorenie inzerátu", async () => {
      await page.goto("/login");
      await page.getByPlaceholder("vas@email.sk").fill(PREDAJCA_EMAIL);
      await page.getByPlaceholder("••••••••").fill(PREDAJCA_PASSWORD);
      await page.getByRole("button", { name: "Prihlásiť sa" }).click();
      await expect(page).toHaveURL(/\/(me|$)/, { timeout: 10000 });

      await page.goto("/create");
      await expect(
        page.getByRole("heading", { name: "Nový inzerát" })
      ).toBeVisible();
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page
        .locator('input[type="file"]')
        .nth(1)
        .setInputFiles("e2e/fixtures/test-image.png");
      await page.waitForTimeout(800);
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.getByLabel("Názov rastliny").fill("Chat test Monstera");
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.getByLabel(/Kraj/i).selectOption({ index: 1 });
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.getByLabel(/Cena/).fill("10");
      await page.getByRole("button", { name: "Ďalej" }).click();

      await page.getByRole("button", { name: "Zverejniť inzerát" }).click();
      await expect(page).toHaveURL(/\/listing\/[a-f0-9-]+/, { timeout: 10000 });
    });

    const listingUrl = page.url();

    await test.step("Kupujúci otvorí inzerát a začne konverzáciu", async () => {
      await page.goto("/me");
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.goto("/login");
      await page.getByPlaceholder("vas@email.sk").fill(KUPUJUCI_EMAIL);
      await page.getByPlaceholder("••••••••").fill(KUPUJUCI_PASSWORD);
      await page.getByRole("button", { name: "Prihlásiť sa" }).click();
      await expect(page).toHaveURL(/\/(me|$)/, { timeout: 10000 });

      await page.goto(listingUrl);
      await page
        .getByRole("button", { name: "Napísať predajcovi" })
        .click();
      await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/, { timeout: 10000 });
    });

    await test.step("Kupujúci odošle správu", async () => {
      await page
        .getByPlaceholder(/Napíšte správu/)
        .fill(MSG_FROM_BUYER);
      await page.getByRole("button", { name: "Odoslať" }).click();
      await expect(page.getByRole("log").getByText(MSG_FROM_BUYER)).toBeVisible({
        timeout: 8000,
      });
    });

    await test.step("Predajca sa prihlási, otvorí Správy a konverzáciu", async () => {
      await page.goto("/me");
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.goto("/login");
      await page.getByPlaceholder("vas@email.sk").fill(PREDAJCA_EMAIL);
      await page.getByPlaceholder("••••••••").fill(PREDAJCA_PASSWORD);
      await page.getByRole("button", { name: "Prihlásiť sa" }).click();
      await expect(page).toHaveURL(/\/(me|$)/, { timeout: 10000 });

      await page.goto("/inbox");
      await expect(
        page.getByRole("heading", { name: "Správy" })
      ).toBeVisible({ timeout: 5000 });
      await page
        .getByRole("link", { name: /Chat test Monstera/ })
        .first()
        .click();
      await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/);
      await expect(page.getByRole("log").getByText(MSG_FROM_BUYER)).toBeVisible();
    });

    await test.step("Predajca odpovie – kupujúci musí správu vidieť", async () => {
      await page.getByPlaceholder(/Napíšte správu/).fill(MSG_FROM_SELLER);
      await page.getByRole("button", { name: "Odoslať" }).click();
      await expect(page.getByRole("log").getByText(MSG_FROM_SELLER)).toBeVisible({
        timeout: 8000,
      });
    });

    await test.step("Kupujúci znova otvorí chat a vidí odpoveď predajcu", async () => {
      await page.goto("/me");
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.goto("/login");
      await page.getByPlaceholder("vas@email.sk").fill(KUPUJUCI_EMAIL);
      await page.getByPlaceholder("••••••••").fill(KUPUJUCI_PASSWORD);
      await page.getByRole("button", { name: "Prihlásiť sa" }).click();
      await expect(page).toHaveURL(/\/(me|$)/, { timeout: 10000 });

      await page.goto("/inbox");
      await page
        .getByRole("link", { name: /Chat test Monstera/ })
        .first()
        .click();
      await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/);
      await expect(page.getByRole("log").getByText(MSG_FROM_BUYER)).toBeVisible();
      await expect(page.getByRole("log").getByText(MSG_FROM_SELLER)).toBeVisible();
    });
  });
});
