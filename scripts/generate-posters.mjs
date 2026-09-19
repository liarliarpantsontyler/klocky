import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 900, height: 600 },
  deviceScaleFactor: 1,
});
await page.goto("http://127.0.0.1:5173/");
await fs.mkdir("public/posters", { recursive: true });
const frames = await page.evaluate(async () => {
  const { backgrounds } = await import("/src/backgrounds/definitions.ts");
  const { ShaderRenderer } = await import("/src/shaders/renderer.ts");
  document.body.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:900px;height:600px;position:fixed;inset:0";
  document.body.append(canvas);
  const renderer = new ShaderRenderer(canvas);
  await new Promise((r) => requestAnimationFrame(r));
  const results = [];
  for (const b of backgrounds) {
    renderer.set(b.algorithm, b.defaultUniforms);
    renderer.setReducedMotion(true);
    results.push({ id: b.id, image: renderer.capture() });
  }
  renderer.dispose();
  return results;
});
for (const { id, image } of frames)
  await fs.writeFile(
    `public/posters/${id}.webp`,
    Buffer.from(image.split(",")[1], "base64"),
  );
await fs.mkdir("public/icons", { recursive: true });
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.goto("http://127.0.0.1:5173/icon.svg");
  await page.screenshot({ path: `public/icons/icon-${size}.png` });
}
await fs.copyFile("public/icons/icon-512.png", "public/icons/maskable-512.png");
console.log(`Captured ${frames.length} original shader posters and app icons.`);
await browser.close();
