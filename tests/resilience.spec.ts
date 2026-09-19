import { test, expect } from "@playwright/test";
import { backgrounds } from "../src/backgrounds/definitions";
import { presets } from "../src/gallery/presets";
import { encodePreset } from "../src/state/storage";
test("all catalogue shaders compile, reduced motion freezes frames, gallery has no GPU contexts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const frames = new Set<string>();
  for (const b of backgrounds) {
    await page.goto(
      "/display?s=" + encodePreset({ ...presets[0], backgroundId: b.id }),
    );
    await expect(page.locator("canvas[data-status=ready]")).toBeVisible();
    const frame = await page.locator("canvas").evaluate((c) => c.toDataURL());
    frames.add(frame);
    await expect
      .poll(() => page.locator("canvas").evaluate((c) => c.toDataURL()))
      .toBe(frame);
  }
  expect(frames.size).toBe(backgrounds.length);
  expect(errors).toEqual([]);
});
test("WebGL unavailable preserves artwork and controls", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl2") return null;
      return original.apply(this, [type, ...args] as never);
    } as typeof original;
  });
  await page.goto("/display?preset=meridian");
  await expect(page.locator(".shader-failed")).toBeAttached();
  await expect(page.getByTestId("clock")).toBeVisible();
  await expect(page.getByLabel("Customize clock")).toBeVisible();
});
test("wake lock is released on exit", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "wakeCounts", {
      value: { request: 0, release: 0 },
    });
    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: async () => {
          const counts = (
            window as unknown as {
              wakeCounts: { request: number; release: number };
            }
          ).wakeCounts;
          counts.request++;
          return {
            released: false,
            release: async () => {
              counts.release++;
            },
            addEventListener: () => {},
          };
        },
      },
    });
  });
  await page.goto("/display?preset=meridian");
  await page.getByRole("button", { name: "Open settings" }).click();
  await page
    .getByRole("switch", { name: "Keep display awake", exact: true })
    .check();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { wakeCounts: { request: number } }).wakeCounts
            .request,
      ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { wakeCounts: { release: number } }).wakeCounts
            .release,
      ),
    )
    .toBe(1);
});
test("settings dialog keeps keyboard focus and Escape restores it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByRole("button", { name: "Close settings" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Reset preferences", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close settings" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open settings" }),
  ).toBeFocused();
});
test("wake-lock denial is explained without interrupting the clock", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: async () => {
          throw new Error("NotAllowedError");
        },
      },
    });
  });
  await page.goto("/display?preset=meridian");
  await page.getByRole("button", { name: "Open settings" }).click();
  await page
    .getByRole("switch", { name: "Keep display awake", exact: true })
    .check();
  await expect(page.locator(".toast")).toContainText(
    "Keep awake is unavailable",
  );
  await expect(page.getByTestId("clock")).toBeVisible();
});
test("analog seconds interpolate independently and honor reduced motion", async ({
  page,
}) => {
  const p = {
    ...presets[2],
    clockOptions: { ...presets[2].clockOptions, showSeconds: true },
  };
  await page.goto("/display?s=" + encodePreset(p));
  const hand = page.locator(".second-hand");
  await expect(hand).toBeVisible();
  await expect
    .poll(() => hand.evaluate((el) => el.getAnimations().length))
    .toBe(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => hand.evaluate((el) => el.getAnimations().length))
    .toBe(0);
});
