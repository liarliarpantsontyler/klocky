import type { KlockyPreset, ClockId, ClockOptions } from "../types";
import { defaultClockOptions, safeClockOptions } from "../clock/definitions";
const make = (
  id: string,
  name: string,
  clockId: ClockId,
  backgroundId: string,
  color = "#fffaf0",
  weight = 400,
  options: Partial<ClockOptions> = {},
): KlockyPreset => ({
  version: 1,
  id,
  name,
  clockId,
  backgroundId,
  clockOptions: safeClockOptions(clockId, {
    ...defaultClockOptions,
    color,
    weight,
    ...options,
  }),
  backgroundOptions: {},
  displayOptions: { reduceMotion: false },
});
export const presets: KlockyPreset[] = [
  make("meridian", "Meridian", "meridian", "cobalt", "#fffaf0", 300),
  make("fold", "Fold", "fold", "isoline", "#ffffff", 700, {
    font: "condensed",
  }),
  make("orbit", "Orbit", "orbit", "abyss", "#f1d6ad"),
  make("sunday", "Sunday", "editorial", "lilt", "#202f47"),
  make("vertigo", "Vertigo", "stack", "chroma", "#ffffff", 700, {
    font: "geometric",
  }),
  make("lucent", "Lucent", "glass", "corona", "#ffffff", 300),
  make("index", "Index", "mono", "signal", "#d7ff85"),
  make("margin", "Margin", "edge", "spectrum", "#124a40", 400, {
    font: "geometric",
  }),
  make("prose", "Prose", "sentence", "weave", "#102f47"),
  make("tempo", "Tempo", "swiss", "sundial", "#16326a"),
  make("quarters", "Quarters", "grid", "terrace", "#e1f2e0", 600, {
    font: "mono",
  }),
  make("transit", "Transit", "ticker", "relay", "#ffffff", 600, {
    font: "condensed",
  }),
  make("still", "Still", "minimal", "flux", "#ffffff", 400, { font: "serif" }),
];
