export type DisplayChromeTone = "on-light" | "on-dark";

const LIGHT_THRESHOLD = 0.62;
const DARK_THRESHOLD = 0.52;

function channel(value: number) {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(r: number, g: number, b: number) {
  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
}

export function parseHexColor(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(normalized)) return null;
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const value = Number.parseInt(expanded, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function averageLuminance(samples: ReadonlyArray<[number, number, number]>) {
  if (!samples.length) return 0;
  let total = 0;
  for (const [r, g, b] of samples) total += relativeLuminance(r, g, b);
  return total / samples.length;
}

export function decideChromeTone(
  meanLuminance: number,
  previous: DisplayChromeTone,
): DisplayChromeTone {
  if (meanLuminance > LIGHT_THRESHOLD) return "on-light";
  if (meanLuminance < DARK_THRESHOLD) return "on-dark";
  return previous;
}

export function luminanceFromHex(hex: string, fallback = 0): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return fallback;
  return relativeLuminance(...rgb);
}

export function normalizedPointUnderElement(
  element: HTMLElement,
  canvas: HTMLCanvasElement,
): readonly [number, number] | null {
  const canvasRect = canvas.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (canvasRect.width <= 0 || canvasRect.height <= 0) return null;
  const nx = (rect.left + rect.width / 2 - canvasRect.left) / canvasRect.width;
  const ny = (rect.top + rect.height / 2 - canvasRect.top) / canvasRect.height;
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
  return [
    Math.min(1, Math.max(0, nx)),
    Math.min(1, Math.max(0, ny)),
  ];
}
