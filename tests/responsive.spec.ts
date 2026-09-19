import { test, expect } from "@playwright/test";
const sizes = [
  [390, 844],
  [844, 390],
  [430, 932],
  [932, 430],
  [768, 1024],
  [1024, 768],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [2520, 1080],
];
for (const [width, height] of sizes)
  test(`${width}x${height} gallery, display and editor`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/collection");
    await expect(
      page.getByRole("button", { name: "Display Meridian", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const previewRatios = await page.locator(".card-art").evaluateAll((cards) =>
      cards.map((card) => {
        const r = card.getBoundingClientRect();
        return r.width / r.height;
      }),
    );
    for (const ratio of previewRatios) expect(ratio).toBeCloseTo(11 / 5, 2);
    const clipped = await page.locator(".card-art").evaluateAll((cards) =>
      cards.flatMap((card, index) => {
        const r = card.getBoundingClientRect();
        return Array.from(
          card.querySelectorAll(
            ".time-text,.flip-pair,.analog-face,.stack-hours,.minute-stack,.sentence-copy,.glass-plaque,.clock-grid,.ticker-time,.minimal-time",
          ),
        )
          .filter((node) => {
            const b = node.getBoundingClientRect();
            return (
              b.left < r.left - 2 ||
              b.right > r.right + 2 ||
              b.top < r.top - 2 ||
              b.bottom > r.bottom + 2
            );
          })
          .map((node) => `${index}: ${node.className}`);
      }),
    );
    expect(clipped).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `case-study-captures/qa/${testInfo.project.name}-${width}x${height}-gallery.png`,
    });
    await page
      .getByRole("button", { name: "Display Meridian", exact: true })
      .click();
    await expect(page.locator("canvas[data-status=ready]")).toBeVisible();
    const canvas = await page
      .locator("canvas")
      .evaluate((c) => ({ width: c.width, height: c.height }));
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(2210000);
    await expect(page.getByLabel("Customize clock")).toBeVisible();
    await page.getByRole("button", { name: "Set Clock & Open" }).click();
    await page.screenshot({
      path: `case-study-captures/qa/${testInfo.project.name}-${width}x${height}-display.png`,
    });
    await page.getByRole("button", { name: "Edit clock", exact: true }).click();
    const panel = await page.getByLabel("Customize clock").boundingBox();
    expect(panel).toBeTruthy();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.y).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(width + 1);
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(height + 1);
    await page.screenshot({
      path: `case-study-captures/qa/${testInfo.project.name}-${width}x${height}-editor.png`,
    });
    await page.getByRole("button", { name: "Set Clock & Open" }).click();
    await page.setViewportSize({ width: height, height: width });
    await expect(page.getByTestId("clock")).toHaveAttribute(
      "data-aspect",
      height / width < 0.85
        ? "portrait"
        : height / width > 2.2
          ? "wide"
          : "landscape",
    );
  });
