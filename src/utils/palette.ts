// Deterministic, weighted k-means over a small local image. No upload or network request.
export async function extractPalette(file: File, count = 6): Promise<string[]> {
  if (file.size > 25 * 1024 * 1024)
    throw new Error("Choose an image smaller than 25 MB.");
  if (!file.type.startsWith("image/"))
    throw new Error("Choose a photograph or image file.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 128 / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * ratio));
    canvas.height = Math.max(1, Math.round(img.height * ratio));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Image processing is unavailable.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels: number[][] = [];
    for (let i = 0; i < data.length; i += 8)
      if (data[i + 3] > 127) pixels.push([data[i], data[i + 1], data[i + 2]]);
    if (!pixels.length) throw new Error("This image has no visible colors.");
    return clusterColors(pixels, count);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function clusterColors(pixels: number[][], count = 6) {
  const distance = (a: number[], b: number[]) =>
    0.3 * (a[0] - b[0]) ** 2 +
    0.59 * (a[1] - b[1]) ** 2 +
    0.11 * (a[2] - b[2]) ** 2;
  const centers = [pixels[Math.floor(pixels.length / 2)].slice()];
  for (let i = 1; i < count; i++) {
    let best = pixels[0],
      max = -1;
    for (const p of pixels) {
      const d = Math.min(...centers.map((c) => distance(p, c)));
      if (d > max) {
        max = d;
        best = p;
      }
    }
    centers.push(best.slice());
  }
  let sizes = Array(count).fill(0);
  for (let iter = 0; iter < 15; iter++) {
    const sums = Array.from({ length: count }, () => [0, 0, 0]);
    sizes = Array(count).fill(0);
    for (const p of pixels) {
      let nearest = 0,
        dist = Infinity;
      centers.forEach((c, i) => {
        const d = distance(p, c);
        if (d < dist) {
          dist = d;
          nearest = i;
        }
      });
      sizes[nearest]++;
      for (let j = 0; j < 3; j++) sums[nearest][j] += p[j];
    }
    for (let i = 0; i < count; i++)
      if (sizes[i]) centers[i] = sums[i].map((n) => n / sizes[i]);
  }
  return centers
    .map((c, i) => ({
      color:
        "#" +
        c.map((n) => Math.round(n).toString(16).padStart(2, "0")).join(""),
      weight: sizes[i],
    }))
    .sort((a, b) => b.weight - a.weight)
    .map((c) => c.color);
}
