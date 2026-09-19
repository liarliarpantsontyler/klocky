import { test, expect } from "@playwright/test";
import { backgrounds } from "../src/backgrounds/definitions";
import { fragmentShader, vertexShader } from "../src/shaders/library";

test("each background responds across the intensity range without losing its artwork", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const results = await page.evaluate(
    ({ backgrounds, vertex, fragments }) => {
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
        const frames = [0, 0.5, 1, 1.5, 2].map((intensity) => {
          gl.uniform1f(location("intensity"), intensity);
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
        });
        const differences = frames.slice(1).map((frame, i) => {
          let difference = 0;
          for (let j = 0; j < frame.pixels.length; j++)
            if (j % 4 !== 3)
              difference += Math.abs(frame.pixels[j] - frames[i].pixels[j]);
          return difference / (canvas.width * canvas.height * 3);
        });
        const ranges = frames.map(({ pixels }) => {
          const luminances = [];
          for (let j = 0; j < pixels.length; j += 4)
            luminances.push((pixels[j] + pixels[j + 1] + pixels[j + 2]) / 3);
          return Math.max(...luminances) - Math.min(...luminances);
        });
        const error = gl.getError();
        gl.deleteProgram(program);
        gl.deleteShader(v);
        gl.deleteShader(f);
        return {
          id: b.id,
          differences,
          ranges,
          error,
          images: [frames[0].image, frames[2].image, frames[4].image],
        };
      });
    },
    {
      backgrounds,
      vertex: vertexShader,
      fragments: Object.fromEntries(
        backgrounds.map((b) => [b.algorithm, fragmentShader(b.algorithm)]),
      ),
    },
  );

  for (const result of results) {
    expect(result.error, `${result.id}: WebGL error`).toBe(0);
    for (const difference of result.differences)
      expect(
        difference,
        `${result.id}: adjacent intensity settings must visibly differ`,
      ).toBeGreaterThan(0.1);
    for (const range of result.ranges)
      expect(
        range,
        `${result.id}: artwork must not collapse into a solid color`,
      ).toBeGreaterThan(5);
  }
  await testInfo.attach("intensity-metrics", {
    body: JSON.stringify(
      results.map(({ images, ...metrics }) => metrics),
      null,
      2,
    ),
    contentType: "application/json",
  });
  // Contact sheets make the aesthetic direction reviewable at both endpoints and the midpoint.
  for (let offset = 0; offset < results.length; offset += 10) {
    await page.setViewportSize({ width: 1040, height: 2340 });
    await page.setContent(
      `<body style="margin:20px;background:#181818;color:white;font:14px sans-serif"><div style="display:grid;grid-template-columns:80px repeat(3, 300px);gap:8px;align-items:center"><b>Intensity</b><b>Low</b><b>Original</b><b>High</b>${results
        .slice(offset, offset + 10)
        .map(
          (r) =>
            `<b>${r.id}</b>${r.images.map((image) => `<img width="300" height="188" src="${image}">`).join("")}`,
        )
        .join("")}</div></body>`,
    );
    await testInfo.attach(`intensity-sheet-${offset / 10 + 1}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }
});
