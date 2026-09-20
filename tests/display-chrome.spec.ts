import { test, expect } from "@playwright/test";
import { presets } from "../src/gallery/presets";
import { encodePreset } from "../src/state/storage";

test("display chrome adapts per control region on Corona", async ({ page }) => {
  const lucent = presets.find((item) => item.id === "lucent");
  if (!lucent) throw new Error("missing lucent preset");
  await page.setViewportSize({ width: 960, height: 720 });
  await page.goto("/display?s=" + encodePreset(lucent));
  await expect(page.locator("canvas[data-status=ready]")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator(".display-top-start")).toHaveAttribute(
    "data-display-chrome",
    "on-light",
    { timeout: 8000 },
  );
  await expect(page.locator(".display-top-start .quiet-button")).toHaveCSS(
    "color",
    "rgb(39, 41, 35)",
  );
  await expect(page.locator(".display-dock")).toHaveAttribute(
    "data-display-chrome",
    "on-dark",
    { timeout: 8000 },
  );
  await expect(page.locator(".display-dock .edit-button")).toHaveCSS(
    "color",
    "rgb(255, 250, 240)",
  );
});
