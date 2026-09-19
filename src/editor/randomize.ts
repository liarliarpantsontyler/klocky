import { fontWeightOptions, weightTierFor } from "../clock/definitions";
import type { FontId } from "../types";

export function pickDifferent<T>(
  items: readonly T[],
  current: T,
  random = Math.random,
) {
  const choices = items.filter((item) => item !== current);
  if (!choices.length) return current;
  return choices[
    Math.min(choices.length - 1, Math.floor(random() * choices.length))
  ];
}

export function randomTypography(
  availableFonts: readonly FontId[],
  currentFont: FontId,
  currentWeight: number,
  random = Math.random,
) {
  const font = pickDifferent(availableFonts, currentFont, random);
  const currentTier = weightTierFor(currentFont, currentWeight);
  const options = fontWeightOptions(font);
  const sameTier = options.find((option) => option.tier === currentTier);
  const weight = pickDifferent(
    options.map((option) => option.value),
    sameTier?.value ?? Number.NaN,
    random,
  );
  return { font, weight };
}
