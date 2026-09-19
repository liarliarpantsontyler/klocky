import { test, expect } from "@playwright/test";

test("background templates progressively reveal full fine-tuning controls", async ({
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
  await page.getByRole("button", { name: /^Background / }).click();

  await page
    .getByRole("button", { name: "Background Haze", exact: true })
    .click();
  await page.getByRole("button", { name: "Fine-tune Haze" }).click();
  await expect(
    page.getByRole("button", { name: /Customize Haze/ }),
  ).toBeVisible();

  const grain = page.getByRole("slider", { name: "Background grain" });
  await expect(grain).toBeVisible();
  await grain.fill("0.1");
  await page.getByLabel("Background color 1", { exact: true }).fill("#123456");

  const advanced = page.getByText("Advanced", { exact: true });
  await expect(
    page.getByRole("slider", { name: "Background distortion" }),
  ).not.toBeVisible();
  await advanced.click();
  await page
    .getByRole("group", { name: "Color blending" })
    .getByRole("button", { name: "Stepped" })
    .click();
  await page
    .getByRole("slider", { name: "Background distortion" })
    .fill("1.25");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem("klocky.v1")!);
        return state.preset.backgroundOptions;
      }),
    )
    .toMatchObject({
      grain: 0.1,
      distortion: 1.25,
      interpolation: 2,
      palette: expect.arrayContaining(["#123456"]),
    });

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("klocky.v1")!).preset
            .backgroundOptions,
      ),
    )
    .toEqual({});
  await page.getByRole("button", { name: "Backgrounds", exact: false }).click();
  await expect(
    page
      .locator(".background-picker")
      .getByRole("button", { name: "Background Haze", exact: true }),
  ).toBeVisible();

  await page
    .locator(".background-picker")
    .getByRole("button", { name: "Background Paper", exact: true })
    .click();
  await page.getByRole("button", { name: "Fine-tune Paper" }).click();
  await page.getByLabel("Background color 1", { exact: true }).fill("#abcdef");
  await expect(page.locator(".display-stage .background")).toHaveCSS(
    "background-color",
    "rgb(171, 205, 239)",
  );
});
