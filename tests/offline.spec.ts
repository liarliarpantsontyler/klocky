import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
// Stop the real origin instead of using WebKit's synthetic offline mode, which can
// abort top-level navigation before the service worker gets its fetch event.
test("cached shell and deep routes survive the origin going offline", async ({
  page,
}) => {
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json",
  };
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url!, "http://localhost").pathname;
      const file = resolve("dist", "." + path);
      let bytes: Buffer;
      let ext = extname(file);
      try {
        bytes = await readFile(file);
      } catch {
        bytes = await readFile("dist/index.html");
        ext = ".html";
      }
      res.writeHead(200, {
        "Content-Type": types[ext] || "application/octet-stream",
      });
      res.end(bytes);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto(origin);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await new Promise<void>((r, reject) =>
      server.close((err) => (err ? reject(err) : r())),
    );
    await page.goto(origin + "/display?preset=orbit");
    await expect(page.locator(".clock-orbit")).toBeVisible();
    await expect(page.locator("canvas[data-status=ready]")).toBeVisible();
    await page.goto(origin + "/lab");
    await expect(
      page.getByRole("heading", { name: "Make room for a new mood." }),
    ).toBeVisible();
  } finally {
    if (server.listening)
      await new Promise<void>((r) => server.close(() => r()));
  }
});
