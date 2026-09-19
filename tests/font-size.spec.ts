import { test, expect } from "@playwright/test";
import { clocks, safeClockOptions } from "../src/clock/definitions";
import { presets } from "../src/gallery/presets";

async function visibleOverflow(page: import("@playwright/test").Page) {
  return page.getByTestId("clock").evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    const parts = Array.from(
      element.querySelector(".clock-composition")!.children,
    )
      .map((child) => child.getBoundingClientRect())
      .filter((bounds) => bounds.width > 0 && bounds.height > 0);
    const content = {
      left: Math.min(...parts.map((bounds) => bounds.left)),
      right: Math.max(...parts.map((bounds) => bounds.right)),
      top: Math.min(...parts.map((bounds) => bounds.top)),
      bottom: Math.max(...parts.map((bounds) => bounds.bottom)),
    };
    return Math.max(
      0,
      viewport.left - content.left,
      content.right - viewport.right,
      viewport.top - content.top,
      content.bottom - viewport.bottom,
    );
  });
}

test("font size starts centered and grows to fill the viewport", async ({
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
  await page.getByRole("button", { name: /^Font / }).click();

  const slider = page.getByRole("slider", { name: "Font size" });
  await expect(slider).toHaveAttribute("min", "14");
  await expect(slider).toHaveAttribute("max", "186");
  await expect(slider).toHaveValue("100");
  await expect(slider).toHaveCSS("--range-fill", "50%");
  await expect(page.locator(".font-size-control output")).toHaveText("Default");
  await expect(page.locator(".clock-composition")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );

  const clock = page.getByTestId("clock");
  const normalWidth = await clock
    .locator(".time-text")
    .evaluate((element) => element.getBoundingClientRect().width);
  await slider.fill("186");
  await expect(page.locator(".font-size-control output")).toHaveText(
    "Full viewport",
  );
  await expect(slider).toHaveCSS("--range-fill", "100%");
  const fullWidth = await clock
    .locator(".time-text")
    .evaluate((element) => element.getBoundingClientRect().width);
  const clockWidth = await clock.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  expect(fullWidth).toBeGreaterThan(normalWidth);
  expect(fullWidth).toBeGreaterThan(clockWidth * 0.8);
  const fittedBounds = await clock.evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    const parts = Array.from(
      element.querySelector(".clock-composition")!.children,
    )
      .map((child) => child.getBoundingClientRect())
      .filter((bounds) => bounds.width > 0 && bounds.height > 0);
    return {
      viewport: {
        left: viewport.left,
        right: viewport.right,
        top: viewport.top,
        bottom: viewport.bottom,
      },
      content: {
        left: Math.min(...parts.map((bounds) => bounds.left)),
        right: Math.max(...parts.map((bounds) => bounds.right)),
        top: Math.min(...parts.map((bounds) => bounds.top)),
        bottom: Math.max(...parts.map((bounds) => bounds.bottom)),
      },
    };
  });
  expect(fittedBounds.content.left).toBeGreaterThanOrEqual(
    fittedBounds.viewport.left,
  );
  expect(fittedBounds.content.right).toBeLessThanOrEqual(
    fittedBounds.viewport.right,
  );
  expect(fittedBounds.content.top).toBeGreaterThanOrEqual(
    fittedBounds.viewport.top,
  );
  expect(fittedBounds.content.bottom).toBeLessThanOrEqual(
    fittedBounds.viewport.bottom,
  );

  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem("klocky.v1") || "{}");
        return saved.preset?.clockOptions?.fontSize;
      }),
    )
    .toBe(186);

  await slider.fill("14");
  await expect(page.locator(".font-size-control output")).toHaveText("14%");
  await expect(page.locator(".clock-composition")).toHaveCSS(
    "transform",
    "matrix(0.14, 0, 0, 0.14, 0, 0)",
  );
});

test("every clock layout remains visible at full viewport size", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/display?preset=meridian");

  for (const clock of clocks) {
    const example =
      presets.find((preset) => preset.clockId === clock.id) ?? presets[0];
    const preset = {
      ...example,
      id: "meridian",
      clockId: clock.id,
      clockOptions: safeClockOptions(clock.id, {
        ...example.clockOptions,
        fontSize: 186,
        showDate: true,
        showSeconds: true,
      }),
    };
    await page.evaluate((nextPreset) => {
      localStorage.setItem(
        "klocky.v1",
        JSON.stringify({
          version: 1,
          onboardingComplete: true,
          preset: nextPreset,
        }),
      );
    }, preset);
    await page.reload();
    await page.evaluate(() => document.fonts.ready);

    await expect
      .poll(() => visibleOverflow(page), {
        message: `${clock.name} should fit the full display`,
      })
      .toBeLessThanOrEqual(0.5);

    await page.getByRole("button", { name: "Edit clock", exact: true }).click();
    await expect
      .poll(() => visibleOverflow(page), {
        message: `${clock.name} should fit above the open editor`,
      })
      .toBeLessThanOrEqual(0.5);
  }
});
