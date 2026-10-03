import { test, expect } from "@playwright/test";

test.describe("Verejné stránky a návrat po prihlásení", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("domov a Hľadám fungujú na mobile bez pretečenia a chýb", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/", "/wanted", "/search", "/login", "/signup"]) {
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);
      await expect(page.locator("main, h1").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test("vyhľadávanie zachová kraj a zrušenie pôvodný dotaz", async ({ page }) => {
    await page.goto("/search?region=Trnavsk%C3%BD+kraj&q=Monstera");
    await page.getByRole("searchbox", { name: "Hľadať rastlinu" }).fill("Hoya");
    await page.getByRole("button", { name: "Zavrieť hľadanie" }).click();
    await expect(page).toHaveURL(/\/\?region=Trnavsk%C3%BD\+kraj&q=Monstera/);
    await page.getByRole("link", { name: "Otvoriť hľadanie rastlín" }).click();
    await page.getByRole("searchbox", { name: "Hľadať rastlinu" }).fill("Hoya");
    await page.getByRole("button", { name: "Hľadať inzeráty pre „Hoya“" }).click();
    await expect(page).toHaveURL(/\/\?region=Trnavsk%C3%BD\+kraj&q=Hoya/);
  });

  test("filtre zachovajú hľadanie a resetujú číslo strany", async ({ page }) => {
    await page.goto("/?q=Monstera&page=2");
    await page.getByRole("button", { name: "Filtre", exact: true }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByRole("combobox", { name: "Kraj", exact: true }).selectOption("Trnavský kraj");
    await drawer.getByRole("button", { name: "Zobraziť výsledky" }).click();
    await expect(page).toHaveURL(/region=Trnavsk%C3%BD\+kraj/);
    const params = new URL(page.url()).searchParams;
    expect(params.get("q")).toBe("Monstera");
    expect(params.has("page")).toBe(false);
  });

  test("hľadanie v Hľadám zostane v požiadavkách a zachová kraj", async ({ page }) => {
    await page.goto("/wanted?region=Trnavsk%C3%BD+kraj&intent=buy");
    const search = page.getByRole("searchbox", { name: "Hľadať rastliny", exact: true });
    await search.fill("Philodendron");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/wanted\?.*q=Philodendron/);
    const params = new URL(page.url()).searchParams;
    expect(params.get("region")).toBe("Trnavský kraj");
    expect(params.get("intent")).toBe("buy");
  });

  test("chránené stránky odkážu na prihlásenie s návratovou cestou", async ({ page }) => {
    for (const path of ["/create", "/inbox", "/me/settings", "/wanted/create", "/saved"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Prihlásiť sa" })).toBeVisible();
      const url = new URL(page.url());
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("next")).toBe(path);
    }
  });

  test("externá návratová URL sa odmietne", async ({ page }) => {
    await page.goto("/login?next=%2F%2Fexample.com");
    const signupHref = await page.getByRole("link", { name: "Vytvoriť účet" }).getAttribute("href");
    const destination = new URL(signupHref!, "http://localhost").searchParams.get("next");
    expect(["/", "/me"]).toContain(destination);
  });

  test("súkromné API a cron vyžadujú oprávnenie", async ({ request }) => {
    for (const path of ["/api/chat/messages?threadId=00000000-0000-4000-8000-000000000000", "/api/inbox/unread", "/api/saved/count", "/api/cron/finalize-auctions"]) {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
    }
    const health = await request.get("/health");
    expect(health.status()).toBe(200);
    expect(await health.text()).toBe("ok");
  });

  test("zlyhanie prihlásenia umožní zopakovať pokus", async ({ page }) => {
    await page.route("**/auth/v1/token?grant_type=password", (route) => route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }),
    }));
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill("test@example.com");
    await page.getByLabel("Heslo", { exact: true }).fill("invalid-password");
    await page.getByRole("button", { name: "Prihlásiť sa", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Nesprávny e-mail alebo heslo." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prihlásiť sa", exact: true })).toBeEnabled();
  });

  test("neexistujúci inzerát zobrazí slovenskú 404 s návratom", async ({ page }) => {
    await page.goto("/listing/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "Stránka sa nenašla" })).toBeVisible();
    await page.getByRole("link", { name: "Späť na domov" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("hľadanie funguje aj bez localStorage", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
    });
    await page.goto("/search");
    await page.getByRole("searchbox", { name: "Hľadať rastlinu" }).fill("Hoya");
    await page.getByRole("button", { name: "Hľadať inzeráty pre „Hoya“" }).click();
    await expect(page).toHaveURL(/\?q=Hoya$/);
  });
});
