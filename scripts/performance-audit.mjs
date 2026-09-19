import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
// This is a short, repeatable resource audit, not a claim of physical-device certification.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("console", (msg) => console.log(msg.text()));
page.on("pageerror", (error) => console.log(error.message));
await page.goto("http://127.0.0.1:5173/");
const report = await page.evaluate(async () => {
  const { ShaderRenderer } = await import("/src/shaders/renderer.ts");
  const { backgrounds } = await import("/src/backgrounds/definitions.ts");
  const counters = { programs: 0, buffers: 0, shaders: 0, textures: 0 };
  const proto = WebGL2RenderingContext.prototype;
  for (const [label, create, remove] of [
    ["programs", "createProgram", "deleteProgram"],
    ["buffers", "createBuffer", "deleteBuffer"],
    ["shaders", "createShader", "deleteShader"],
    ["textures", "createTexture", "deleteTexture"],
  ]) {
    const make = proto[create],
      del = proto[remove];
    proto[create] = function (...a) {
      const v = make.apply(this, a);
      if (v) counters[label]++;
      return v;
    };
    proto[remove] = function (value) {
      if (value) counters[label]--;
      return del.call(this, value);
    };
  }
  document.body.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:640px;height:400px";
  document.body.append(canvas);
  const renderer = new ShaderRenderer(canvas);
  await new Promise((r) => requestAnimationFrame(r));
  for (let i = 0; i < 140; i++) {
    const b = backgrounds[i % backgrounds.length];
    renderer.set(b.algorithm, b.defaultUniforms);
    renderer.setReducedMotion(true);
  }
  console.log("140 shader switches complete");
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  await new Promise((r) => requestAnimationFrame(r));
  const afterSwitches = { ...counters };
  renderer.set(backgrounds[0].algorithm, backgrounds[0].defaultUniforms);
  renderer.setReducedMotion(false);
  const samples = [];
  let last = performance.now();
  const start = last;
  await new Promise((resolve) => {
    function measure(now) {
      if (now - last < 200) samples.push(now - last);
      last = now;
      if (now - start < 15000) requestAnimationFrame(measure);
      else resolve();
    }
    requestAnimationFrame(measure);
  });
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  console.log("Frame pacing sample complete");
  const frame = renderer.capture();
  renderer.setReducedMotion(true);
  const frozen = renderer.capture();
  await new Promise((r) => setTimeout(r, 250));
  const staticFrame = renderer.capture();
  renderer.dispose();
  const afterDispose = { ...counters };
  const recoveryCanvas = document.createElement("canvas");
  recoveryCanvas.style.cssText = "width:300px;height:200px";
  document.body.append(recoveryCanvas);
  const recovery = new ShaderRenderer(recoveryCanvas);
  recovery.set(backgrounds[0].algorithm, backgrounds[0].defaultUniforms);
  recovery.setReducedMotion(true);
  const gl = recoveryCanvas.getContext("webgl2");
  const extension = gl.getExtension("WEBGL_lose_context");
  let restored = false;
  if (extension) {
    const lost = new Promise((r) =>
      recoveryCanvas.addEventListener("webglcontextlost", r, { once: true }),
    );
    extension.loseContext();
    await Promise.race([
      lost,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Context loss timeout")), 5000),
      ),
    ]);
    const ready = new Promise((r) =>
      recoveryCanvas.addEventListener(
        "webglcontextrestored",
        () => {
          restored = recoveryCanvas.dataset.status === "ready";
          r();
        },
        { once: true },
      ),
    );
    await new Promise((r) => setTimeout(r, 100));
    extension.restoreContext();
    await Promise.race([ready, new Promise((r) => setTimeout(r, 5000))]);
  }
  recovery.dispose();
  return {
    viewport: { width: 1920, height: 1080 },
    switches: 140,
    resourcesAfterSwitches: afterSwitches,
    resourcesAfterDispose: afterDispose,
    sampleSeconds: 15,
    frames: samples.length,
    meanFrameMs: mean,
    p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
    observedFps: 1000 / mean,
    renderPixels: canvas.width * canvas.height,
    reducedMotionStable: frozen === staticFrame,
    frameBytes: frame.length,
    contextRestored: restored,
  };
});
await fs.mkdir("case-study-captures/qa", { recursive: true });
await fs.writeFile(
  "case-study-captures/qa/performance.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
await browser.close();
