import { test, expect } from "@playwright/test";
import { presets } from "../src/gallery/presets";
import { encodePreset } from "../src/state/storage";
test("collection → display → live editor → persistence → share", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Collection" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Display / })).toHaveCount(13);
  await page
    .getByRole("button", { name: "Display Meridian", exact: true })
    .click();
  await expect(page.getByTestId("display-stage")).toBeVisible();
  await expect(page.locator("canvas[data-status=ready]")).toBeVisible();
  await expect(page.getByLabel("Customize clock")).toBeVisible();
  await expect(
    page.locator(".display-top-actions").getByRole("button", {
      name: "Copy link",
    }),
  ).toBeVisible();
  await expect(
    page.locator(".display-top-actions").getByRole("button", {
      name: "Enter fullscreen",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Keep screen awake" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^Background / }).click();
  await page
    .getByRole("button", { name: "Background Boreal", exact: true })
    .click();
  await expect(
    page.getByLabel("Background Boreal", { exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Layout / }).click();
  await page.getByRole("button", { name: "Lucent", exact: false }).click();
  await expect(page.locator(".clock-glass")).toBeVisible();
  await page.getByRole("button", { name: /^Font / }).click();
  await page.getByRole("button", { name: /System Sans.*12:48 Aa/ }).click();
  await page.getByRole("option", { name: /Space Grotesk.*12:48 Aa/ }).click();
  await page
    .getByRole("group", { name: "Font weight" })
    .getByRole("button", { name: /Thin/ })
    .click();
  await page.getByRole("button", { name: /^Layout / }).click();
  await page
    .getByRole("button", { name: "Clock color #d7ff85", exact: true })
    .click();
  await page.getByRole("switch", { name: "24-hour time", exact: true }).check();
  await page.getByRole("switch", { name: "Show seconds" }).check();
  await page.getByRole("button", { name: "Set Clock & Open" }).click();
  await page.reload();
  await expect(page.locator(".clock-glass")).toBeVisible();
  expect(
    await page
      .locator(".clock")
      .evaluate((el) => (el as HTMLElement).style.color),
  ).toBe("rgb(215, 255, 133)");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("klocky.v1")!),
  );
  expect(stored.preset.backgroundId).toBe("boreal");
  expect(stored.preset.clockOptions.hour24).toBe(true);
  const shared = context.browser() && (await context.newPage());
  if (shared) {
    await shared.goto("/display?s=" + encodePreset(stored.preset));
    await expect(shared.locator(".clock-glass")).toBeVisible();
    await shared.close();
  }
  expect(errors).toEqual([]);
});
test("favorites, filtering and recent clocks", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Favorite Meridian", exact: true })
    .click();
  await page.getByRole("button", { name: /^My favorites/ }).click();
  await expect(page.getByRole("button", { name: /^Display / })).toHaveCount(1);
  await page.getByRole("button", { name: "Klocky collection" }).click();
  await page.getByRole("button", { name: "Analog", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Display / })).toHaveCount(2);
  await page
    .getByRole("button", { name: "Display Orbit", exact: true })
    .click();
  await expect(page.getByTestId("display-stage")).toBeVisible();
  await page.keyboard.press("c");
  await page.getByRole("button", { name: "Recent", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Display Orbit", exact: true }),
  ).toBeVisible();
});
test.describe("weather with deterministic API responses", () => {
  test.use({ serviceWorkers: "block" });
  test("weather is opt-in and manual cities work", async ({ page }) => {
    let calls = 0;
    await page.route("**/geocoding-api.open-meteo.com/**", (r) =>
      r.fulfill({
        json: {
          results: [
            {
              name: "Chicago",
              admin1: "Illinois",
              latitude: 41.88,
              longitude: -87.63,
            },
          ],
        },
      }),
    );
    await page.route("**/api.open-meteo.com/**", (r) => {
      calls++;
      return r.fulfill({
        json: { current: { temperature_2m: 22, weather_code: 0 } },
      });
    });
    await page.goto("/display?preset=meridian");
    expect(calls).toBe(0);
    await expect(page.getByLabel("Customize clock")).toBeVisible();
    await page.getByRole("button", { name: /^Layout / }).click();
    await page.getByRole("button", { name: "Set up weather" }).click();
    expect(calls).toBe(0);
    await page.getByLabel("Search city").fill("Chicago");
    await page.getByRole("button", { name: "Find", exact: true }).click();
    await page
      .getByRole("button", { name: "Chicago, Illinois", exact: true })
      .click();
    await expect(page.getByTestId("clock")).toHaveAccessibleName(/22° Clear/);
    await page.getByRole("button", { name: "Change", exact: true }).click();
    await page.getByLabel("Temperature unit").selectOption("fahrenheit");
    await expect.poll(() => calls).toBe(2);
  });
});
test("shortcuts, fullscreen and idle chrome", async ({ page, browserName }) => {
  await page.goto("/display?preset=meridian");
  await expect(page.getByTestId("clock")).toBeVisible();
  await expect(page.getByLabel("Customize clock")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Customize clock")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".clock-fold")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("f");
  if (browserName === "chromium") {
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(true);
    await page.keyboard.press("f");
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(false);
  }
  await page.locator(".display-stage").click({ position: { x: 20, y: 180 } });
  await expect(page.locator(".player")).toHaveClass(/is-ambient/, {
    timeout: 7000,
  });
  await page.mouse.move(100, 180);
  await expect(page.locator(".player")).not.toHaveClass(/is-ambient/);
});
test("settings validation, reset and restore-last launch", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("switch", { name: "Restore last clock" }).check();
  await page.getByRole("switch", { name: "24-hour time", exact: true }).check();
  await page.getByLabel("Time zone", { exact: true }).fill("Moon/Fake");
  await page.getByRole("heading", { name: "A few preferences." }).click();
  await expect(page.getByRole("alert")).toContainText("IANA");
  await page.getByLabel("Time zone", { exact: true }).fill("Asia/Tokyo");
  await page.getByRole("heading", { name: "A few preferences." }).click();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.reload();
  await expect(page.getByTestId("display-stage")).toBeVisible();
  await page.getByRole("button", { name: "Open settings" }).click();
  await page
    .getByRole("button", { name: "Reset preferences", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("klocky.v1")!),
  );
  expect(data.preferences.timezone).toBe("");
  expect(data.preferences.restoreLast).toBe(false);
});
test("Lab palette editing, photo extraction, JSON and poster export", async ({
  page,
}) => {
  await page.goto("/lab");
  await expect(
    page.getByRole("heading", { name: "Make room for a new mood." }),
  ).toBeVisible();
  await page.getByLabel("Shader family").selectOption("boreal");
  await page.getByLabel("Preset name", { exact: true }).fill("My green room");
  await page.getByRole("button", { name: "Add color", exact: true }).click();
  await expect(
    page.getByLabel("Palette color 6", { exact: true }),
  ).toBeAttached();
  await page
    .getByRole("button", { name: "Delete color 6", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move color 2 up", exact: true })
    .click();
  await page
    .getByLabel("Upload photograph")
    .setInputFiles("public/icons/icon-192.png");
  await expect(
    page.getByRole("img", { name: "Your local source photograph" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Palette color 6", { exact: true }),
  ).toBeAttached();
  await page.getByRole("switch", { name: "Photograph through glass" }).check();
  await expect(page.getByLabel("Shader family")).toHaveValue("weave");
  await expect
    .poll(() =>
      page.locator("canvas").evaluate((canvas) => {
        const gl = canvas.getContext("webgl2")!;
        const program = gl.getParameter(gl.CURRENT_PROGRAM);
        return gl.getUniform(
          program,
          gl.getUniformLocation(program, "u_hasImage"),
        );
      }),
    )
    .toBe(1);
  await page.getByLabel("Warp", { exact: true }).fill("1.25");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save as preset", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("my-green-room.json");
  const json = JSON.parse(
    await page.getByLabel("Exported background JSON").inputValue(),
  );
  expect(json.defaultUniforms.warp).toBe(1.25);
  expect(json.defaultUniforms.palette).toHaveLength(6);
  expect(json.algorithm).toBe("weave");
  const poster = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Capture poster frame", exact: true })
    .click();
  expect((await poster).suggestedFilename()).toContain(".webp");
  await page
    .getByRole("switch", { name: "Photograph through glass" })
    .uncheck();
  await expect
    .poll(() =>
      page.locator("canvas").evaluate((canvas) => {
        const gl = canvas.getContext("webgl2")!;
        const program = gl.getParameter(gl.CURRENT_PROGRAM);
        return gl.getUniform(
          program,
          gl.getUniformLocation(program, "u_hasImage"),
        );
      }),
    )
    .toBe(0);
});
test("every composition fits phone portrait and landscape", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const p of presets) {
      await page.goto("/display?s=" + encodePreset(p));
      await expect(page.getByTestId("clock")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const out = await page.locator(".clock-composition").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return Array.from(
          el.querySelectorAll(
            ".time-text,.flip-pair,.analog-face,.stack-hours,.minute-stack,.sentence-copy,.glass-plaque,.clock-grid,.ticker-time,.minimal-time",
          ),
        )
          .map((n) => ({ c: n.className, r: n.getBoundingClientRect() }))
          .filter(
            ({ r: b }) =>
              b.width > r.width + 2 ||
              b.height > r.height + 2 ||
              b.top < r.top - 2 ||
              b.bottom > r.bottom + 2 ||
              b.left < r.left - 2 ||
              b.right > r.right + 2,
          )
          .map((n) => n.c);
      });
      expect(out, p.name + " " + viewport.width).toEqual([]);
    }
  }
});
