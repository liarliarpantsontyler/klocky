import { defaultClockOptions } from "../clock/definitions";
import type { KlockyPreset } from "../types";

// The hero uses the collection itself so its pairings cannot drift from curation.
export { presets as welcomeClocks } from "../gallery/presets";

export const neutralClock: KlockyPreset = {
  version: 1,
  id: "custom",
  name: "My clock",
  clockId: "meridian",
  backgroundId: "paper",
  clockOptions: { ...defaultClockOptions, color: "#222321", showDate: false },
  backgroundOptions: {},
  displayOptions: { reduceMotion: false },
};
