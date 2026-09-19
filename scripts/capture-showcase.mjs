import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const out = "case-study-captures/showcase";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  timezoneId: "America/Chicago",
  reducedMotion: "reduce",
});
await page.clock.setFixedTime(new Date("2026-09-19T15:24:00Z"));
await page.goto("http://127.0.0.1:5173/");
await page
  .getByRole("button", { name: "Display Meridian", exact: true })
  .waitFor();
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out + "/gallery.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: out + "/mobile-gallery.png", fullPage: true });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:5173/display?preset=meridian");
await page.locator("canvas[data-status=ready]").waitFor();
await page.getByRole("button", { name: "Edit clock", exact: true }).click();
await page.screenshot({ path: out + "/desktop-editor.png" });
await page.goto("http://127.0.0.1:5173/lab");
await page.locator("canvas[data-status=ready]").waitFor();
await page.screenshot({ path: out + "/lab.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:5173/display?preset=fold");
await page.locator("canvas[data-status=ready]").waitFor();
await page.locator(".player.is-ambient").waitFor({ timeout: 10000 });
await page.screenshot({ path: out + "/phone-portrait.png" });
await page.setViewportSize({ width: 844, height: 390 });
await page.screenshot({ path: out + "/phone-landscape.png" });
const defs = await page.evaluate(async () => {
  const { backgrounds } = await import("/src/backgrounds/definitions.ts");
  return backgrounds.map((b) => ({ name: b.name, id: b.id, family: b.family }));
});
await page.setViewportSize({ width: 1440, height: 1140 });
await page.setContent(
  `<style>body{margin:0;padding:40px;background:#f6f5f1;font:12px system-ui;color:#32392a}h1{font-size:28px;font-weight:400;margin:0 0 30px}main{display:grid;grid-template-columns:repeat(7,1fr);gap:24px 16px}img{width:100%;aspect-ratio:1.15;object-fit:cover;border-radius:5px}strong{font-weight:500;display:block;margin:7px 0 3px}small{color:#87907a}</style><h1>Klocky · ${defs.length} atmospheres</h1><main>${defs.map((b) => `<div><img src="http://127.0.0.1:5173/posters/${b.id}.webp"><strong>${b.name}</strong><small>${b.family}</small></div>`).join("")}</main>`,
);
await page
  .locator("img")
  .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
await page.screenshot({
  path: out + "/background-contact-sheet.png",
  fullPage: true,
});
await browser.close();
console.log(
  "Saved gallery, editor, Lab, phone pair and all-background contact sheet.",
);
