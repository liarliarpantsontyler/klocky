import type { ClockDefinition, ClockId, ClockOptions, FontId } from "../types";

export const CLOCK_SIZE_MIN = 14;
export const CLOCK_SIZE_DEFAULT = 100;
export const CLOCK_SIZE_MAX = 186;

export type FontWeightTier = "thin" | "regular" | "bold" | "chonky";
export interface FontDefinition {
  name: string;
  css: string;
  weights: Partial<Record<FontWeightTier, number>>;
}

export const weightTiers: FontWeightTier[] = [
  "thin",
  "regular",
  "bold",
  "chonky",
];

export const weightNames: Record<FontWeightTier, string> = {
  thin: "Thin",
  regular: "Regular",
  bold: "Bold",
  chonky: "Chonky",
};

export const fonts: Record<FontId, FontDefinition> = {
  sans: {
    name: "System Sans",
    css: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
    weights: { thin: 300, regular: 400, bold: 700, chonky: 900 },
  },
  geometric: {
    name: "Space Grotesk",
    css: '"Space Grotesk", "Avenir Next", sans-serif',
    weights: { thin: 300, regular: 400, bold: 600, chonky: 700 },
  },
  serif: {
    name: "Editorial Serif",
    css: 'Georgia, "Times New Roman", serif',
    weights: { regular: 400, chonky: 700 },
  },
  mono: {
    name: "System Mono",
    css: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    weights: { regular: 400, chonky: 700 },
  },
  condensed: {
    name: "Antonio",
    css: 'Antonio, "Arial Narrow", sans-serif',
    weights: { thin: 100, regular: 400, bold: 600, chonky: 700 },
  },
  "libre-baskerville": {
    name: "Libre Baskerville",
    css: '"Libre Baskerville", Georgia, serif',
    weights: { regular: 400, bold: 600, chonky: 700 },
  },
  "rubik-80s-fade": {
    name: "Rubik 80s Fade",
    css: '"Rubik 80s Fade", sans-serif',
    weights: { regular: 400 },
  },
  "rubik-mono-one": {
    name: "Rubik Mono One",
    css: '"Rubik Mono One", monospace',
    weights: { regular: 400 },
  },
  silkscreen: {
    name: "Silkscreen",
    css: "Silkscreen, monospace",
    weights: { regular: 400, chonky: 700 },
  },
  "jersey-20": {
    name: "Jersey 20",
    css: '"Jersey 20", sans-serif',
    weights: { regular: 400 },
  },
  danfo: {
    name: "Danfo",
    css: "Danfo, serif",
    weights: { regular: 400 },
  },
  "days-one": {
    name: "Days One",
    css: '"Days One", sans-serif',
    weights: { regular: 400 },
  },
  "tiempos-headline": {
    name: "Tiempos Headline",
    css: '"Tiempos Headline", Georgia, serif',
    weights: { thin: 300, regular: 400, bold: 700, chonky: 900 },
  },
  "american-typewriter": {
    name: "American Typewriter",
    css: '"American Typewriter Web", "Courier New", serif',
    weights: { thin: 300, regular: 400, bold: 600, chonky: 700 },
  },
  "black-valentine": {
    name: "Black Valentine",
    css: '"Black Valentine", cursive',
    weights: { regular: 400 },
  },
};

export const fontIds = Object.keys(fonts) as FontId[];

export function isFontId(value: unknown): value is FontId {
  return typeof value === "string" && value in fonts;
}

export function fontWeightOptions(font: FontId) {
  return weightTiers.flatMap((tier) => {
    const value = fonts[font].weights[tier];
    return value === undefined
      ? []
      : [{ tier, label: weightNames[tier], value }];
  });
}

export function weightTierFor(font: FontId, weight: number) {
  const options = fontWeightOptions(font);
  return options.reduce((best, option) =>
    Math.abs(option.value - weight) < Math.abs(best.value - weight)
      ? option
      : best,
  ).tier;
}

export function remapFontWeight(from: FontId, to: FontId, weight: number) {
  const sourceIndex = weightTiers.indexOf(weightTierFor(from, weight));
  return fontWeightOptions(to).reduce((best, option) =>
    Math.abs(weightTiers.indexOf(option.tier) - sourceIndex) <
    Math.abs(weightTiers.indexOf(best.tier) - sourceIndex)
      ? option
      : best,
  ).value;
}
const make = (
  id: ClockId,
  name: string,
  description: string,
  category: ClockDefinition["category"] = "Digital",
): ClockDefinition => ({
  id,
  name,
  description,
  category,
  premium: !["meridian", "fold", "orbit"].includes(id),
  allowedFills: ["solid", "translucent", "outline"],
  allowedFonts: [...fontIds],
  allowedColors: ["#fffaf0", "#272923", "#d7ff85", "#f8bc95", "#e0d8f5"],
  supportsSeconds: true,
  supportsWeather: true,
  supportsGlass: id === "glass" || id === "fold",
  portrait: "vertical",
  landscape: "horizontal",
});
export const clocks: ClockDefinition[] = [
  make("meridian", "Meridian", "The everyday, beautifully."),
  make("fold", "Fold", "A little mechanical poetry."),
  make("orbit", "Orbit", "Time comes full circle.", "Analog"),
  make("stack", "Vertigo", "A minute in motion."),
  make("editorial", "Sunday", "A softer sort of time.", "Typographic"),
  make("sentence", "Prose", "A moment in words.", "Typographic"),
  make("mono", "Index", "Precisely here."),
  make("swiss", "Tempo", "Nothing extra.", "Analog"),
  make("glass", "Lucent", "Light, held for a moment."),
  make("edge", "Margin", "Room to breathe."),
  make("grid", "Quarters", "Everything in its place."),
  make("ticker", "Transit", "Always arriving."),
  make("minimal", "Still", "Only what matters.", "Typographic"),
  make("words", "Wordplay", "Every minute, in words.", "Typographic"),
  make("world", "Elsewhere", "One moment. Many places."),
];
for (const c of clocks) {
  if (["orbit", "swiss"].includes(c.id)) {
    c.allowedFills = ["solid", "translucent"];
  }
  if (["editorial", "sentence"].includes(c.id)) {
    c.allowedFills = ["solid", "translucent"];
  }
}

export const clockById = (id: string) =>
  clocks.find((c) => c.id === id) ?? clocks[0];
export const defaultClockOptions: ClockOptions = {
  font: "sans",
  fontSize: CLOCK_SIZE_DEFAULT,
  weight: 400,
  color: "#fffaf0",
  opacity: 1,
  fill: "solid",
  glass: "frosted",
  showSeconds: false,
  showDate: true,
  showWeather: false,
  showLocation: false,
  hour24: false,
};
export function safeClockOptions(
  id: string,
  options: ClockOptions,
): ClockOptions {
  const c = clockById(id);
  const font = c.allowedFonts.includes(options.font)
    ? options.font
    : c.allowedFonts[0];
  const allowedWeights = fontWeightOptions(font).map((choice) => choice.value);
  return {
    ...options,
    font,
    fontSize: Math.max(
      CLOCK_SIZE_MIN,
      Math.min(CLOCK_SIZE_MAX, options.fontSize ?? CLOCK_SIZE_DEFAULT),
    ),
    weight: allowedWeights.includes(options.weight)
      ? options.weight
      : fontWeightOptions(font).find(
          (choice) => choice.tier === weightTierFor(font, options.weight),
        )!.value,
    fill: c.allowedFills.includes(options.fill)
      ? options.fill
      : c.allowedFills[0],
    showSeconds: c.supportsSeconds && options.showSeconds,
    showWeather: c.supportsWeather && options.showWeather,
  };
}
