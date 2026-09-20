import { describe, it, expect, vi, afterEach } from "vitest";
import {
  encodePreset,
  decodePreset,
  sanitizePreset,
  sanitizePreferences,
  defaults,
  readState,
  writeState,
  STORAGE_KEY,
} from "../src/state/storage";
import {
  shouldPromptAfterFavoriteAdd,
  shouldPromptAfterShareWithFavorite,
} from "../src/account/syncPrompt";
import { mergeSyncIntoLocal } from "../src/account/syncPayload";
import { presets } from "../src/gallery/presets";
import { timeParts } from "../src/hooks/useTime";
import {
  clocks,
  fontWeightOptions,
  fonts,
  remapFontWeight,
  weightTierFor,
} from "../src/clock/definitions";
import { backgrounds } from "../src/backgrounds/definitions";
import { algorithms } from "../src/shaders/library";
import { clusterColors } from "../src/utils/palette";
import {
  MotionTimeline,
  motionProfiles,
  motionRate,
} from "../src/shaders/motion";
import {
  decideChromeTone,
  luminanceFromHex,
  relativeLuminance,
} from "../src/utils/displayChromeTone";

describe("scene motion", () => {
  it("covers the catalogue with increasing rates and a true standstill", () => {
    for (const background of backgrounds) {
      expect(motionProfiles[background.algorithm]).toBeDefined();
      expect(motionRate(background.algorithm, 0)).toBe(0);
      const rates = [0.02, 0.1, 0.5, 1, 2, 3, 4].map((value) =>
        motionRate(background.algorithm, value),
      );
      rates
        .slice(1)
        .forEach((rate, i) => expect(rate).toBeGreaterThan(rates[i]));
      const preset = sanitizePreset({
        ...presets[0],
        backgroundId: background.id,
        backgroundOptions: { motion: 0 },
      });
      expect(preset?.backgroundOptions.motion).toBe(0);
    }
  });

  it("changes speed without jumping through previously elapsed time", () => {
    const timeline = new MotionTimeline(0);
    timeline.setRate(0.5, 0);
    expect(timeline.advance(60000)).toBe(30);
    timeline.setRate(5, 60000);
    expect(timeline.advance(60000)).toBe(30);
    expect(timeline.advance(61000)).toBe(35);
    timeline.setRate(0, 61000);
    expect(timeline.advance(120000)).toBe(35);
    timeline.setRate(2, 120000);
    expect(timeline.advance(121000)).toBe(37);
    timeline.resume(180000);
    expect(timeline.advance(181000)).toBe(39);
  });
});
describe("share boundary", () => {
  it("roundtrips Unicode and independent options", () => {
    const p = {
      ...presets[0],
      name: "夕暮れ · Montréal",
      backgroundOptions: { palette: ["#001122", "#ffeeaa"], seed: 42 },
    };
    expect(decodePreset(encodePreset(p))).toEqual(p);
  });
  it("rejects malformed and oversized links", () => {
    for (const v of ["bad", "☃", "a".repeat(10001), btoa('{"version":7}')])
      expect(decodePreset(v)).toBeNull();
  });
  it("rejects unknown definitions and clamps unsafe uniforms", () => {
    expect(sanitizePreset({ ...presets[0], clockId: "evil" })).toBeNull();
    const p = sanitizePreset({
      ...presets[0],
      clockOptions: {
        ...presets[0].clockOptions,
        opacity: -5,
        color: "url(bad)",
      },
      backgroundOptions: { motion: 500, seed: NaN, palette: ["red"] },
    })!;
    expect(p.clockOptions.opacity).toBe(0.5);
    expect(p.clockOptions.fontSize).toBe(100);
    expect(p.clockOptions.color).toBe("#fffaf0");
    expect(p.backgroundOptions.motion).toBe(4);
    expect(p.backgroundOptions.palette).toBeUndefined();
  });
  it("clamps saved clock font sizes to the responsive control range", () => {
    const tooSmall = sanitizePreset({
      ...presets[0],
      clockOptions: { ...presets[0].clockOptions, fontSize: 1 },
    });
    const tooLarge = sanitizePreset({
      ...presets[0],
      clockOptions: { ...presets[0].clockOptions, fontSize: 500 },
    });
    expect(tooSmall?.clockOptions.fontSize).toBe(14);
    expect(tooLarge?.clockOptions.fontSize).toBe(186);
  });
  it("validates zones, locale and coordinates", () => {
    const p = sanitizePreferences({
      timezone: "Moon/Fake",
      locale: "invalid_thing",
      weatherLocation: { name: "X", latitude: Infinity, longitude: 0 },
    });
    expect(p.timezone).toBe("");
    expect(p.locale).toBe("");
    expect(p.weatherLocation).toBeNull();
  });
});
describe("time and library", () => {
  it("reads midnight, alternate zone and noon correctly", () => {
    const d = new Date("2026-09-19T00:05:09Z");
    expect(timeParts(d, true, "en-US", "UTC")).toMatchObject({
      hour: "00",
      minute: "05",
      second: "09",
    });
    expect(timeParts(d, false, "en-US", "UTC")).toMatchObject({
      hour: "12",
      period: "AM",
    });
    expect(
      timeParts(new Date("2026-09-19T12:00:00Z"), false, "en-US", "UTC").period,
    ).toBe("PM");
    expect(timeParts(d, true, "en-US", "America/Chicago").hour).toBe("19");
  });
  it("preserves the curated collection and 40 unique shader algorithms", () => {
    expect(presets).toHaveLength(13);
    expect(clocks).toHaveLength(15);
    const procedural = backgrounds.filter((b) => !b.staticBackground);
    expect(procedural).toHaveLength(40);
    expect(new Set(procedural.map((b) => b.algorithm)).size).toBe(
      procedural.length,
    );
    backgrounds.forEach((b) => expect(algorithms[b.algorithm]).toBeTruthy());
    presets.forEach((p) => expect(sanitizePreset(p)).toEqual(p));
  });
  it("offers several compatible fonts for every clock layout", () => {
    clocks.forEach((clock) =>
      expect(clock.allowedFonts.length, clock.name).toBeGreaterThanOrEqual(3),
    );
  });
  it("includes every requested display typeface in every clock layout", () => {
    const requested = [
      "Libre Baskerville",
      "Rubik 80s Fade",
      "Rubik Mono One",
      "Silkscreen",
      "Jersey 20",
      "Danfo",
      "Days One",
      "Tiempos Headline",
      "American Typewriter",
      "Black Valentine",
    ];
    const requestedIds = Object.entries(fonts)
      .filter(([, font]) => requested.includes(font.name))
      .map(([id]) => id);

    expect(requestedIds).toHaveLength(requested.length);
    clocks.forEach((clock) =>
      expect(clock.allowedFonts, clock.name).toEqual(
        expect.arrayContaining(requestedIds),
      ),
    );
  });
  it("shows only distinct weights that a typeface actually supports", () => {
    for (const font of Object.keys(fonts) as Array<keyof typeof fonts>) {
      const options = fontWeightOptions(font);
      expect(options.length).toBeGreaterThanOrEqual(1);
      expect(options.length).toBeLessThanOrEqual(4);
      expect(new Set(options.map((option) => option.value)).size).toBe(
        options.length,
      );
      expect(options.at(-1)?.value).toBe(
        Math.max(
          ...Object.values(fonts[font].weights).filter(
            (weight): weight is number => weight !== undefined,
          ),
        ),
      );
      if (options.length > 1) expect(options.at(-1)?.label).toBe("Chonky");
    }
    expect(fontWeightOptions("serif").map((option) => option.label)).toEqual([
      "Regular",
      "Chonky",
    ]);
  });
  it("preserves the semantic weight when changing typefaces", () => {
    expect(weightTierFor("sans", 900)).toBe("chonky");
    expect(remapFontWeight("sans", "condensed", 900)).toBe(700);
    expect(remapFontWeight("condensed", "geometric", 100)).toBe(300);
  });
  it("extracts dominant colors instead of inventing them", () => {
    const colors = clusterColors(
      [
        ...Array.from({ length: 100 }, () => [200, 20, 40]),
        ...Array.from({ length: 50 }, () => [20, 100, 150]),
      ],
      2,
    );
    expect(colors).toEqual(["#c81428", "#146496"]);
  });
});

import { CarouselMotion } from "../src/onboarding/physics";
import { welcomeClocks, neutralClock } from "../src/onboarding/presets";
import {
  validTimezone,
  zoneDetails,
  resolveCoordinates,
} from "../src/onboarding/location";
import { clockWords } from "../src/clock/words";
import { randomClockIndex } from "../src/onboarding/ChooseClockList";
import { pickDifferent, randomTypography } from "../src/editor/randomize";

describe("onboarding persistence and curated clocks", () => {
  afterEach(() => vi.unstubAllGlobals());
  function storage() {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    return data;
  }
  it("uses the actual curated collection, preserving every visual option", () => {
    expect(welcomeClocks).toBe(presets);
    welcomeClocks.forEach((p) => expect(sanitizePreset(p)).toEqual(p));
    expect(sanitizePreset(neutralClock)).toEqual(neutralClock);
  });
  it("can choose every curated clock through the random action", () => {
    expect(randomClockIndex(welcomeClocks.length, () => 0)).toBe(0);
    expect(randomClockIndex(welcomeClocks.length, () => 0.999999)).toBe(
      welcomeClocks.length - 1,
    );
  });
  it("restores completion, customization, place and time settings together", () => {
    storage();
    const saved = defaults();
    saved.onboardingComplete = true;
    saved.preset = structuredClone(welcomeClocks[2]);
    saved.preset.clockOptions.color = "#abcdef";
    saved.preferences.timezone = "Asia/Kathmandu";
    saved.preferences.hour24 = true;
    saved.preferences.weatherLocation = {
      name: "Kathmandu",
      latitude: 27.71,
      longitude: 85.32,
    };
    expect(writeState(saved)).toBe(true);
    const restored = readState();
    expect(restored.preset.clockOptions.showWeather).toBe(true);
    expect(restored.preset.clockOptions.showLocation).toBe(true);
    expect(restored).toEqual({
      ...saved,
      preset: {
        ...saved.preset,
        clockOptions: {
          ...saved.preset.clockOptions,
          showWeather: true,
          showLocation: true,
        },
      },
    });
    saved.onboardingComplete = false;
    writeState(saved);
    expect(readState().onboardingComplete).toBe(false);
    expect(readState().preset.clockOptions.showWeather).toBe(true);
    expect(readState().preset.clockOptions.showLocation).toBe(true);
  });
  it("welcomes new users, migrates returning users and respects replay", () => {
    const data = storage();
    expect(readState().onboardingComplete).toBe(false);
    const legacy = {
      ...defaults(),
      onboardingComplete: undefined,
      recent: ["fold"],
    };
    data.set(STORAGE_KEY, JSON.stringify(legacy));
    expect(readState().onboardingComplete).toBe(true);
    data.set(
      STORAGE_KEY,
      JSON.stringify({ ...legacy, onboardingComplete: false }),
    );
    expect(readState().onboardingComplete).toBe(false);
    data.set(STORAGE_KEY, "broken");
    expect(readState().onboardingComplete).toBe(false);
  });
  it("keeps running when persistence is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    });
    expect(readState()).toEqual(defaults());
    expect(writeState(defaults())).toBe(false);
  });
});

describe("editor randomizers", () => {
  it("always picks a different available value when one exists", () => {
    expect(pickDifferent(["a", "b", "c"], "b", () => 0)).toBe("a");
    expect(pickDifferent(["a", "b", "c"], "b", () => 0.999)).toBe("c");
  });

  it("keeps the only compatible value", () => {
    expect(pickDifferent(["sans"], "sans", () => 0.5)).toBe("sans");
  });

  it("randomizes both typeface and an available weight", () => {
    expect(randomTypography(["sans", "serif"], "sans", 400, () => 0)).toEqual({
      font: "serif",
      weight: 700,
    });
  });
});

describe("carousel motion", () => {
  it("preserves momentum at the loop boundary without a visual jump", () => {
    const motion = new CarouselMotion();
    motion.position = 7950;
    motion.velocity = 870;
    motion.target = 8000;
    motion.wrap(4000, 100);
    expect(motion.position).toBe(3950);
    expect(motion.velocity).toBe(870);
    expect(motion.target! - motion.position).toBe(50);
  });
  it("never advances itself while a finger is dragging", () => {
    const motion = new CarouselMotion();
    motion.position = 500;
    motion.velocity = 1300;
    motion.dragging = true;
    motion.advance(0.016, 20000, 300, 0, true);
    expect(motion.position).toBe(500);
  });
  it("decelerates a flick and settles, then resumes only after idle", () => {
    const motion = new CarouselMotion();
    motion.interact(0);
    motion.velocity = 1200;
    motion.position = 40;
    motion.advance(0.016, 16, 300, 0, true);
    expect(motion.position).toBeGreaterThan(40);
    expect(motion.velocity).toBeLessThan(1200);
    for (let now = 32; now <= 4000; now += 16)
      motion.advance(0.016, now, 300, 0, true);
    expect(motion.position).toBeCloseTo(300, 0);
    const settled = motion.position;
    for (let now = 4016; now <= 4400; now += 16)
      motion.advance(0.016, now, 300, 0, true);
    expect(motion.position).toBeCloseTo(settled, 1);
    for (let now = 4416; now <= 6500; now += 16)
      motion.advance(0.016, now, 300, 0, true);
    expect(motion.position).toBeGreaterThan(settled + 10);
  });
  it("disables automatic movement for reduced motion while allowing manual settling", () => {
    const motion = new CarouselMotion();
    for (let now = 0; now <= 10000; now += 16)
      motion.advance(0.016, now, 300, 0, false);
    expect(motion.position).toBe(0);
    motion.position = 175;
    motion.interact(10000);
    for (let now = 10016; now <= 14000; now += 16)
      motion.advance(0.016, now, 300, 0, false);
    expect(motion.position).toBeCloseTo(300, 0);
  });
});

describe("location and live time", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("handles daylight saving transitions and fractional timezone offsets", () => {
    expect(validTimezone("Moon/Fake")).toBe(false);
    expect(validTimezone("Asia/Kathmandu")).toBe(true);
    expect(
      zoneDetails(new Date("2026-07-15T12:00:00Z"), "America/Chicago"),
    ).toMatchObject({ offset: "UTC-05:00", daylight: true });
    expect(
      zoneDetails(new Date("2026-01-15T12:00:00Z"), "America/Chicago"),
    ).toMatchObject({ offset: "UTC-06:00", daylight: false });
    expect(
      zoneDetails(new Date("2026-07-15T12:00:00Z"), "Asia/Kathmandu"),
    ).toMatchObject({ offset: "UTC+05:45", daylight: false });
    expect(
      zoneDetails(new Date("2026-01-15T12:00:00Z"), "Australia/Sydney")
        .daylight,
    ).toBe(true);
  });
  it("resolves GPS into a city and its actual timezone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () =>
          url.includes("bigdatacloud")
            ? { city: "Dallas", principalSubdivision: "Texas" }
            : { timezone: "America/Chicago" },
      })),
    );
    expect(
      await resolveCoordinates(32.78, -96.8, new AbortController().signal),
    ).toEqual({
      location: { name: "Dallas, Texas", latitude: 32.78, longitude: -96.8 },
      timezone: "America/Chicago",
      approximate: false,
    });
  });
  it("provides a device timezone when network lookup is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const result = await resolveCoordinates(
      32.78,
      -96.8,
      new AbortController().signal,
    );
    expect(validTimezone(result.timezone)).toBe(true);
    expect(result.approximate).toBe(true);
    expect(result.location.name).toBe("Current location");
  });
  it("never commits an aborted coordinate lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const controller = new AbortController();
    controller.abort();
    await expect(
      resolveCoordinates(32.78, -96.8, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("renders exact minutes as words", () => {
    expect(clockWords(12, 0)).toBe("twelve\no’clock");
    expect(clockWords(9, 5)).toBe("nine\noh five");
    expect(clockWords(23, 48)).toBe("twenty three\nforty eight");
  });
});

describe("account sync prompt", () => {
  it("opens after enough favorites, not on unfavorite", () => {
    let state = defaults();
    expect(shouldPromptAfterFavoriteAdd(state, true)).toBe(false);
    state = { ...state, favorites: ["aurora", "dusk"] };
    expect(shouldPromptAfterFavoriteAdd(state, true)).toBe(true);
    expect(shouldPromptAfterFavoriteAdd(state, false)).toBe(false);
  });

  it("respects dismiss and auto-shown flags", () => {
    const state = {
      ...defaults(),
      favorites: ["a", "b"],
      accountSync: { dismissed: true, autoShown: false },
    };
    expect(shouldPromptAfterFavoriteAdd(state, true)).toBe(false);
    expect(
      shouldPromptAfterShareWithFavorite(
        { ...state, accountSync: { dismissed: false, autoShown: false } },
        true,
      ),
    ).toBe(true);
  });

  it("merges remote favorites without dropping local", () => {
    const local = { ...defaults(), favorites: ["aurora"] };
    const merged = mergeSyncIntoLocal(local, {
      version: 1,
      favorites: ["dusk"],
      savedFavorites: [],
      preferences: {
        weatherLocation: null,
        timezone: "Europe/London",
        unit: "celsius",
        hour24: false,
        seconds: false,
        locale: "",
      },
    });
    expect(merged.favorites).toEqual(["aurora", "dusk"]);
    expect(merged.preferences.timezone).toBe("Europe/London");
  });
});

describe("display fullscreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubDocument(hasRequestFullscreen: boolean) {
    const documentElement = hasRequestFullscreen
      ? { requestFullscreen: vi.fn().mockResolvedValue(undefined) }
      : {};
    vi.stubGlobal("document", {
      documentElement,
      fullscreenElement: null,
      exitFullscreen: vi.fn(),
    });
  }

  it("treats installed standalone as immersive without showing controls", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("standalone"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    stubDocument(false);
    const notify = vi.fn();
    const { isStandaloneDisplay, shouldShowFullscreenControl, fullscreen } =
      await import("../src/hooks/useDisplay");
    expect(isStandaloneDisplay()).toBe(true);
    expect(shouldShowFullscreenControl()).toBe(false);
    await fullscreen(notify);
    expect(notify).not.toHaveBeenCalled();
  });

  it("returns install-needed when not standalone and the API is missing", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    stubDocument(false);
    const notify = vi.fn();
    const {
      shouldShowFullscreenControl,
      shouldOfferInstall,
      fullscreen,
    } = await import("../src/hooks/useDisplay");
    expect(shouldShowFullscreenControl()).toBe(true);
    expect(shouldOfferInstall()).toBe(true);
    await expect(fullscreen(notify)).resolves.toBe("install-needed");
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not offer install when the fullscreen API is available", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    stubDocument(true);
    const { shouldOfferInstall } = await import("../src/hooks/useDisplay");
    expect(shouldOfferInstall()).toBe(false);
  });
});

describe("display chrome tone", () => {
  it("treats Corona pale fields as light backdrops", () => {
    expect(luminanceFromHex("#fafaff")).toBeGreaterThan(0.62);
  });

  it("keeps hysteresis between light and dark thresholds", () => {
    expect(decideChromeTone(0.7, "on-dark")).toBe("on-light");
    expect(decideChromeTone(0.4, "on-light")).toBe("on-dark");
    expect(decideChromeTone(0.57, "on-dark")).toBe("on-dark");
    expect(decideChromeTone(0.57, "on-light")).toBe("on-light");
  });

  it("uses sRGB relative luminance", () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 5);
    expect(relativeLuminance(0, 0, 0)).toBe(0);
  });
});
