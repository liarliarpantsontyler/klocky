import { test, expect } from "@playwright/test";
import { motionRate } from "../src/shaders/motion";
import { backgrounds } from "../src/backgrounds/definitions";
import { fragmentShader, vertexShader } from "../src/shaders/library";

test("each scene animates intrinsically, including photo glass, across its motion range", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.goto("/");
  const results = await page.evaluate(
    ({ backgrounds, vertex, fragments, rates }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 200;
      const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true })!;
      if (!gl) throw new Error("WebGL2 unavailable");
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(shader)!);
        return shader;
      };
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      // Exercise Weave with both a palette and a real image texture.
      const photo = document.createElement("canvas");
      photo.width = photo.height = 64;
      const ctx = photo.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, 64, 64);
      gradient.addColorStop(0, "#db794c");
      gradient.addColorStop(0.5, "#6f8fa5");
      gradient.addColorStop(1, "#f1e5b9");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = "#22333c";
      ctx.fillRect(20, 15, 18, 30);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        photo,
      );
      const cases = [
        ...backgrounds,
        { ...backgrounds.find((b) => b.id === "weave")!, id: "weave-photo" },
      ];
      return cases.map((b) => {
        const program = gl.createProgram()!;
        const v = compile(gl.VERTEX_SHADER, vertex);
        const f = compile(gl.FRAGMENT_SHADER, fragments[b.algorithm]);
        gl.attachShader(program, v);
        gl.attachShader(program, f);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw new Error(`${b.id}: ${gl.getProgramInfoLog(program)}`);
        gl.useProgram(program);
        const location = (name: string) =>
          gl.getUniformLocation(program, `u_${name}`);
        const position = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        for (const [key, value] of Object.entries(b.defaultUniforms))
          if (typeof value === "number") gl.uniform1f(location(key), value);
        const palette = b.defaultUniforms.palette;
        gl.uniform3fv(
          location("palette[0]"),
          Array.from({ length: 8 }, (_, i) => {
            const hex = palette[i % palette.length].slice(1);
            return [0, 2, 4].map(
              (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
            );
          }).flat(),
        );
        gl.uniform1i(location("paletteCount"), palette.length);
        gl.uniform2f(location("resolution"), canvas.width, canvas.height);
        gl.uniform2f(location("pointer"), 0.5, 0.5);
        gl.uniform1f(location("pixelRatio"), 1);
        gl.uniform1f(location("time"), 0);
        gl.uniform1i(location("image"), 0);
        gl.uniform1f(location("hasImage"), b.id === "weave-photo" ? 1 : 0);
        gl.uniform2f(location("imageSize"), 64, 64);
        const render = (time: number) => {
          gl.uniform1f(location("time"), time);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(
            0,
            0,
            canvas.width,
            canvas.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
          return { pixels, image: canvas.toDataURL() };
        };
        const difference = (a: Uint8Array, b: Uint8Array) => {
          let total = 0;
          for (let i = 0; i < a.length; i++)
            if (i % 4 !== 3) total += Math.abs(a[i] - b[i]);
          return total / (canvas.width * canvas.height * 3);
        };
        const start = render(0);
        const changes = rates[b.algorithm].map(({ level, rate }) => {
          gl.uniform1f(location("motion"), level);
          const samePhase = render(0);
          const end = render(4 * rate);
          return {
            level,
            initialChange: difference(start.pixels, samePhase.pixels),
            change: difference(start.pixels, end.pixels),
          };
        });
        const highRate = rates[b.algorithm].at(-1)!.rate;
        const frames = [start, render(highRate * 2), render(highRate * 4)];
        const error = gl.getError();
        gl.deleteProgram(program);
        gl.deleteShader(v);
        gl.deleteShader(f);
        return {
          id: b.id,
          changes,
          error,
          images: frames.map((frame) => frame.image),
        };
      });
    },
    {
      backgrounds,
      rates: Object.fromEntries(
        backgrounds.map((b) => [
          b.algorithm,
          [0, 0.08, 1, 2, 3].map((level) => ({
            level,
            rate: motionRate(b.algorithm, level),
          })),
        ]),
      ),
      vertex: vertexShader,
      fragments: Object.fromEntries(
        backgrounds.map((b) => [b.algorithm, fragmentShader(b.algorithm)]),
      ),
    },
  );

  for (const result of results) {
    const background = backgrounds.find((b) => b.id === result.id);
    const staticEssential =
      background &&
      background.defaultUniforms.motion === 0 &&
      background.customizableUniforms.length === 0;
    expect(result.error, `${result.id}: WebGL error`).toBe(0);
    expect(result.changes[0].change, `${result.id}: zero motion freezes`).toBe(
      0,
    );
    for (const change of result.changes)
      expect(
        change.initialChange,
        `${result.id}: speed must not change composition`,
      ).toBe(0);
    if (staticEssential) continue;
    expect(
      result.changes.at(-1)!.change,
      `${result.id}: high motion visibly animates`,
    ).toBeGreaterThan(0.1);
    expect(
      result.changes.at(-1)!.change,
      `${result.id}: high motion exceeds gentle motion`,
    ).toBeGreaterThan(result.changes[1].change + 0.05);
  }
  await testInfo.attach("motion-metrics", {
    body: JSON.stringify(
      results.map(({ images, ...metrics }) => metrics),
      null,
      2,
    ),
    contentType: "application/json",
  });
  // Compare scene evolution with the composition anchored at high motion.
  for (let offset = 0; offset < results.length; offset += 10) {
    await page.setViewportSize({ width: 1040, height: 2340 });
    await page.setContent(
      `<body style="margin:20px;background:#181818;color:white;font:14px sans-serif"><div style="display:grid;grid-template-columns:80px repeat(3, 300px);gap:8px;align-items:center"><b>Motion</b><b>Start</b><b>2 seconds</b><b>4 seconds</b>${results
        .slice(offset, offset + 10)
        .map(
          (r) =>
            `<b>${r.id}</b>${r.images.map((image) => `<img width="300" height="188" src="${image}">`).join("")}`,
        )
        .join("")}</div></body>`,
    );
    await testInfo.attach(`motion-sheet-${offset / 10 + 1}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }
});

test("motion slider pauses, resumes, persists zero, and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/display?preset=meridian");
  await page.getByRole("button", { name: "Edit clock", exact: true }).click();
  await page
    .locator(".background-picker")
    .getByRole("button", { name: "Background Haze", exact: true })
    .click();
  const canvas = page.locator("canvas[data-status=ready]");
  await expect(canvas).toBeVisible();
  const phase = () =>
    canvas.evaluate((c) => {
      const gl = c.getContext("webgl2")!;
      const program = gl.getParameter(gl.CURRENT_PROGRAM);
      return gl.getUniform(
        program,
        gl.getUniformLocation(program, "u_time"),
      ) as number;
    });
  const motion = page.getByRole("slider", { name: "Background motion speed" });
  await motion.fill("100");
  const start = await phase();
  await expect.poll(phase).toBeGreaterThan(start);
  await motion.fill("-100");
  const stopped = await phase();
  const frame = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(200);
  expect(await phase()).toBe(stopped);
  await page.mouse.move(100, 180);
  expect(await canvas.evaluate((c) => c.toDataURL())).toBe(frame);
  await page.reload();
  await page.getByRole("button", { name: "Edit clock", exact: true }).click();
  await page
    .locator(".background-picker")
    .getByRole("button", { name: "Background Haze", exact: true })
    .click();
  await expect(motion).toHaveValue("-100");
  await expect(canvas).toBeVisible();
  expect(await phase()).toBe(0);
  await motion.fill("100");
  await expect.poll(phase).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  const reducedPhase = await phase();
  await motion.fill("0");
  await page.waitForTimeout(200);
  expect(await phase()).toBe(reducedPhase);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(phase).toBeGreaterThan(reducedPhase);
});
