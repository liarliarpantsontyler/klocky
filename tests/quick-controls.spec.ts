import { test, expect } from "@playwright/test";

test("quick background sliders use value fill without a center tick", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "klocky.v1",
      JSON.stringify({ version: 1, onboardingComplete: true }),
    ),
  );
  await page.goto("/display?preset=meridian");
  await page.getByRole("button", { name: "Edit clock", exact: true }).click();
  await page
    .getByRole("button", { name: "Background Haze", exact: true })
    .click();

  const backgroundPanel = page.locator("#editor-background-content");
  const controls = backgroundPanel.getByRole("group", {
    name: "Quick background controls",
  });
  await expect(controls).toBeVisible();
  const sliders = controls.getByRole("slider");
  await expect(sliders).toHaveCount(3);
  await expect(sliders.first()).toHaveCSS("--range-fill", "50%");

  await sliders.first().fill("100");
  await expect(sliders.first()).toHaveCSS("--range-fill", "100%");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--klocky-blue")
        .trim(),
    ),
  ).toBe("#365ef2");

  const firstTrack = controls.locator(".quick-slider-track").first();
  expect(
    await firstTrack.evaluate(
      (element) => getComputedStyle(element, "::after").content,
    ),
  ).toBe("none");

  const [trackBox, labelBox] = await Promise.all([
    firstTrack.boundingBox(),
    controls
      .locator(".quick-background-slider > span:last-child")
      .first()
      .boundingBox(),
  ]);
  expect(trackBox).toBeTruthy();
  expect(labelBox).toBeTruthy();
  expect(labelBox!.y - (trackBox!.y + trackBox!.height)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      trackBox!.x + trackBox!.width / 2 - (labelBox!.x + labelBox!.width / 2),
    ),
  ).toBeLessThanOrEqual(1);
});
