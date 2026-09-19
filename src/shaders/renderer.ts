import type { BackgroundOptions } from "../types";
import { fragmentShader, vertexShader } from "./library";
import { MotionTimeline, motionRate } from "./motion";
export class ShaderRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null;
  private texture: WebGLTexture | null;
  private source: HTMLImageElement | null = null;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private colors = new Float32Array(24);
  private opts: BackgroundOptions | null = null;
  private frame = 0;
  private timeline = new MotionTimeline(performance.now());
  private quality = 1;
  private sample = 0;
  private elapsed = 0;
  private last = 0;
  private frozen = false;
  private disposed = false;
  private observer: ResizeObserver;
  private width = 1;
  private height = 1;
  private visibility = () => {
    cancelAnimationFrame(this.frame);
    this.timeline.resume(performance.now());
    this.timeline.setRate(
      document.hidden || this.frozen
        ? 0
        : motionRate(this.algorithm, this.opts?.motion ?? 0),
      performance.now(),
    );
    this.last = 0;
    if (!document.hidden) this.loop(performance.now());
  };
  private lost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frame);
    this.canvas.dataset.status = "fallback";
  };
  private restored = () => {
    if (this.opts) {
      this.timeline.resume(performance.now());
      // Context restoration invalidates every old GPU handle.
      this.program = null;
      this.uniforms.clear();
      this.buffer = this.gl.createBuffer();
      this.texture = this.gl.createTexture();
      this.setImage(this.source);
      this.set(this.algorithm, this.opts);
      this.resize();
    }
  };
  private algorithm = "mesh";
  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.buffer = gl.createBuffer();
    this.texture = gl.createTexture();
    this.setImage(null);
    this.observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      this.width = r.width;
      this.height = r.height;
      this.resize();
    });
    this.observer.observe(canvas);
    document.addEventListener("visibilitychange", this.visibility);
    canvas.addEventListener("webglcontextlost", this.lost);
    canvas.addEventListener("webglcontextrestored", this.restored);
  }
  private compile(type: number, source: string) {
    const g = this.gl,
      s = g.createShader(type)!;
    g.shaderSource(s, source);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
      const error = g.getShaderInfoLog(s);
      g.deleteShader(s);
      throw new Error(error ?? "Shader compilation failed");
    }
    return s;
  }
  set(algorithm: string, options: BackgroundOptions) {
    const g = this.gl;
    if (this.algorithm !== algorithm)
      this.timeline = new MotionTimeline(performance.now());
    this.algorithm = algorithm;
    this.opts = options;
    if (this.program) g.deleteProgram(this.program);
    const v = this.compile(g.VERTEX_SHADER, vertexShader),
      f = this.compile(g.FRAGMENT_SHADER, fragmentShader(algorithm));
    const p = g.createProgram()!;
    g.attachShader(p, v);
    g.attachShader(p, f);
    g.linkProgram(p);
    g.deleteShader(v);
    g.deleteShader(f);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) {
      g.deleteProgram(p);
      throw new Error("Shader link failed");
    }
    this.program = p;
    g.useProgram(p);
    this.uniforms.clear();
    [
      "time",
      "resolution",
      "pixelRatio",
      "pointer",
      "palette[0]",
      "paletteCount",
      "image",
      "hasImage",
      "imageSize",
      ...Object.keys(options).filter((k) => k !== "palette"),
    ].forEach((k) => this.uniforms.set(k, g.getUniformLocation(p, "u_" + k)));
    g.uniform2f(this.uniforms.get("pointer") ?? null, 0.5, 0.5);
    this.bindImage();
    g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
    g.bufferData(
      g.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      g.STATIC_DRAW,
    );
    const a = g.getAttribLocation(p, "a_position");
    g.enableVertexAttribArray(a);
    g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
    this.update(options);
    this.canvas.dataset.status = "ready";
    cancelAnimationFrame(this.frame);
    this.loop(performance.now());
  }
  update(o: BackgroundOptions) {
    this.opts = o;
    this.timeline.setRate(
      this.frozen || document.hidden ? 0 : motionRate(this.algorithm, o.motion),
      performance.now(),
    );
    const g = this.gl;
    g.useProgram(this.program);
    for (let i = 0; i < 8; i++) {
      const s = o.palette[i % o.palette.length].slice(1);
      this.colors[i * 3] = parseInt(s.slice(0, 2), 16) / 255;
      this.colors[i * 3 + 1] = parseInt(s.slice(2, 4), 16) / 255;
      this.colors[i * 3 + 2] = parseInt(s.slice(4, 6), 16) / 255;
    }
    g.uniform3fv(this.uniforms.get("palette[0]") ?? null, this.colors);
    g.uniform1i(this.uniforms.get("paletteCount") ?? null, o.palette.length);
    Object.entries(o).forEach(([k, v]) => {
      if (typeof v === "number") g.uniform1f(this.uniforms.get(k) ?? null, v);
    });
    cancelAnimationFrame(this.frame);
    this.loop(performance.now());
  }
  setReducedMotion(v: boolean) {
    if (this.frozen === v) return;
    this.frozen = v;
    this.timeline.setRate(
      v || document.hidden
        ? 0
        : motionRate(this.algorithm, this.opts?.motion ?? 0),
      performance.now(),
    );
    cancelAnimationFrame(this.frame);
    this.loop(performance.now());
  }
  private bindImage() {
    const g = this.gl;
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, this.texture);
    g.uniform1i(this.uniforms.get("image") ?? null, 0);
    g.uniform1f(this.uniforms.get("hasImage") ?? null, this.source ? 1 : 0);
    g.uniform2f(
      this.uniforms.get("imageSize") ?? null,
      this.source?.naturalWidth || 1,
      this.source?.naturalHeight || 1,
    );
  }
  setImage(source: HTMLImageElement | null) {
    this.source = source;
    const g = this.gl;
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, this.texture);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true);
    if (source) {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(
        1,
        2048 / Math.max(source.naturalWidth, source.naturalHeight),
      );
      canvas.width = Math.max(1, Math.round(source.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(source.naturalHeight * ratio));
      canvas
        .getContext("2d")!
        .drawImage(source, 0, 0, canvas.width, canvas.height);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, canvas);
    } else {
      g.texImage2D(
        g.TEXTURE_2D,
        0,
        g.RGBA,
        1,
        1,
        0,
        g.RGBA,
        g.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]),
      );
    }
    if (this.program && !g.isContextLost()) {
      g.useProgram(this.program);
      this.bindImage();
      this.draw(performance.now());
    }
  }
  pointer(x: number, y: number) {
    if (this.frozen || this.opts?.motion === 0) return;
    this.gl.uniform2f(this.uniforms.get("pointer") ?? null, x, y);
  }
  private resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2) * this.quality;
    const maxPixels = 2200000;
    const limit = Math.min(
      1,
      Math.sqrt(maxPixels / Math.max(1, this.width * this.height * dpr * dpr)),
    );
    this.canvas.width = Math.max(1, Math.round(this.width * dpr * limit));
    this.canvas.height = Math.max(1, Math.round(this.height * dpr * limit));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.draw(performance.now());
  }
  private draw(now: number) {
    if (!this.program || this.disposed || this.gl.isContextLost()) return;
    const g = this.gl;
    g.useProgram(this.program);
    g.uniform1f(this.uniforms.get("time") ?? null, this.timeline.advance(now));
    g.uniform2f(
      this.uniforms.get("resolution") ?? null,
      this.canvas.width,
      this.canvas.height,
    );
    g.uniform1f(
      this.uniforms.get("pixelRatio") ?? null,
      Math.min(devicePixelRatio || 1, 2) * this.quality,
    );
    g.drawArrays(g.TRIANGLES, 0, 6);
  }
  private loop = (now: number) => {
    if (this.disposed || document.hidden) return;
    this.draw(now);
    if (this.frozen || this.opts?.motion === 0) return;
    if (this.last && now - this.last < 150) {
      this.elapsed += now - this.last;
      this.sample++;
      if (this.sample >= 150) {
        if (this.elapsed / this.sample > 18.5 && this.quality > 0.5) {
          this.quality = Math.max(0.5, this.quality * 0.8);
          this.resize();
        }
        this.elapsed = 0;
        this.sample = 0;
      }
    }
    this.last = now;
    this.frame = requestAnimationFrame(this.loop);
  };
  capture() {
    this.draw(performance.now());
    return this.canvas.toDataURL("image/webp", 0.9);
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    this.canvas.removeEventListener("webglcontextlost", this.lost);
    this.canvas.removeEventListener("webglcontextrestored", this.restored);
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteTexture(this.texture);
    this.source = null;
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
