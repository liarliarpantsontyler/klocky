import { test, expect } from "@playwright/test";

test("bundled display fonts load successfully", async ({ page }) => {
  await page.goto("/");
  const families = [
    "Libre Baskerville",
    "Rubik 80s Fade",
    "Rubik Mono One",
    "Silkscreen",
    "Jersey 20",
    "Danfo",
    "Days One",
    "Tiempos Headline",
    "American Typewriter Web",
    "Black Valentine",
  ];

  const unloaded = await page.evaluate(async (names) => {
    const failed: string[] = [];
    for (const name of names) {
      try {
        const faces = await document.fonts.load(
          `400 48px "${name}"`,
          "12:48 Aa",
        );
        if (faces.length === 0 || !document.fonts.check(`400 48px "${name}"`))
          failed.push(name);
      } catch {
        failed.push(name);
      }
    }
    return failed;
  }, families);

  expect(unloaded).toEqual([]);
});

test("randomizing Sunday and Prose changes the visible clock typeface", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "klocky.v1",
      JSON.stringify({ version: 1, onboardingComplete: true }),
    );
    // Reproducible picks covering different typefaces, always excluding the current one.
    const picks = [0, 0.5, 0.99];
    let next = 0;
    Math.random = () => picks[next++ % picks.length];
  });
  await page.goto("/display?preset=meridian");
  await page.getByRole("button", { name: "Edit clock", exact: true }).click();
  await page.getByRole("button", { name: /^Layout / }).click();

  for (const [name, selector] of [
    ["Sunday", ".editorial-date, .time-text"],
    ["Prose", ".sentence-copy, .sentence-copy strong"],
  ]) {
    await page
      .locator(".layout-picker")
      .getByRole("button", { name, exact: true })
      .click();
    const clock = page.getByTestId("clock");
    for (let attempt = 0; attempt < 4; attempt++) {
      const previousFont = await clock.getAttribute("data-font");
      const previousFamily = await clock
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily);
      await page
        .getByRole("button", { name: "Randomize font", exact: true })
        .click();
      await expect(clock).not.toHaveAttribute("data-font", previousFont!);
      const selectedFamily = await clock.evaluate(
        (el) => getComputedStyle(el).fontFamily,
      );
      expect(selectedFamily).not.toBe(previousFamily);
      for (const text of await clock.locator(selector).all()) {
        await expect(text).toHaveCSS("font-family", selectedFamily);
      }
    }
  }
});

test("randomize all changes background, layout, and typography together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "klocky.v1",
      JSON.stringify({ version: 1, onboardingComplete: true }),
    ),
  );
  await page.goto("/display?preset=meridian");
  await page.getByRole("button", { name: "Edit clock", exact: true }).click();

  const summaries = page.locator(".section-selection > span");
  const before = await summaries.allTextContents();
  await page
    .getByRole("button", { name: "Randomize all", exact: true })
    .click();

  await expect.poll(() => summaries.allTextContents()).not.toEqual(before);
  const after = await summaries.allTextContents();
  expect(after[0]).not.toBe(before[0]);
  expect(after[1]).not.toBe(before[1]);
  expect(after[2]).not.toBe(before[2]);
  const randomize = page.getByRole("button", {
    name: "Randomize all",
    exact: true,
  });
  await expect(
    page.getByRole("button", { name: "Set Clock & Open", exact: true }),
  ).toHaveCount(0);
  await expect(randomize).toBeVisible();
  await expect(page.locator(".editor-scroll")).toContain(randomize);
  await expect(page.locator(".editor-footer")).toHaveCount(0);
});
