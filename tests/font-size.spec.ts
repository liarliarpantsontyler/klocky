import { test, expect } from "@playwright/test";

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
  expect(fullWidth).toBeGreaterThan(normalWidth * 2);
  expect(fullWidth).toBeGreaterThan(clockWidth * 0.8);

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
