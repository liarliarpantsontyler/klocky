import type {
  SavedState,
  UserPreferences,
  KlockyPreset,
  BackgroundOptions,
} from "../types";
import {
  defaultAccountSync,
  sanitizeAccountSync,
} from "../account/syncPrompt";
import { presets } from "../gallery/presets";
import {
  clocks,
  CLOCK_SIZE_MAX,
  CLOCK_SIZE_MIN,
  isFontId,
  presetWithWeatherDefaults,
  safeClockOptions,
} from "../clock/definitions";
import { backgrounds, uniformControls } from "../backgrounds/definitions";
export const STORAGE_KEY = "klocky.v1";
export const INSTALL_HINT_DISMISSED_KEY = "klocky.installHintDismissed";
export function isInstallHintDismissed() {
  try {
    return localStorage.getItem(INSTALL_HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
export function dismissInstallHint() {
  try {
    localStorage.setItem(INSTALL_HINT_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}
export const defaultPreferences: UserPreferences = {
  hour24: false,
  unit: "celsius",
  locale: "",
  timezone: "",
  seconds: false,
  reduceMotion: false,
  keepAwake: false,
  autoFullscreen: false,
  restoreLast: false,
  weatherLocation: null,
};
export const defaults = (): SavedState => ({
  version: 1,
  onboardingComplete: false,
  preset: structuredClone(presets[0]),
  preferences: { ...defaultPreferences },
  recent: [],
  favorites: [],
  savedFavorites: [],
  accountSync: defaultAccountSync(),
});
const hex = (v: unknown): v is string =>
  typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
export function sanitizePreset(value: unknown): KlockyPreset | null {
  if (!value || typeof value !== "object") return null;
  const p = value as KlockyPreset;
  if (
    p.version !== 1 ||
    !clocks.some((c) => c.id === p.clockId) ||
    !backgrounds.some((b) => b.id === p.backgroundId)
  )
    return null;
  const base = structuredClone(presets[0]);
  base.clockId = p.clockId;
  base.backgroundId = p.backgroundId;
  base.id = typeof p.id === "string" ? p.id.slice(0, 80) : "custom";
  base.name = typeof p.name === "string" ? p.name.slice(0, 80) : "My clock";
  const o = p.clockOptions ?? {};
  const clean = { ...base.clockOptions };
  for (const key of [
    "showSeconds",
    "showDate",
    "showWeather",
    "showLocation",
    "hour24",
  ] as const)
    if (typeof o[key] === "boolean") clean[key] = o[key];
  if (hex(o.color)) clean.color = o.color;
  if (typeof o.opacity === "number" && Number.isFinite(o.opacity))
    clean.opacity = Math.max(0.5, Math.min(1, o.opacity));
  if (isFontId(o.font)) clean.font = o.font;
  if (typeof o.fontSize === "number" && Number.isFinite(o.fontSize))
    clean.fontSize = Math.max(
      CLOCK_SIZE_MIN,
      Math.min(CLOCK_SIZE_MAX, o.fontSize),
    );
  if (
    typeof o.weight === "number" &&
    Number.isFinite(o.weight) &&
    o.weight >= 100 &&
    o.weight <= 900
  )
    clean.weight = o.weight;
  if (["solid", "translucent", "outline"].includes(o.fill)) clean.fill = o.fill;
  if (["frosted", "clear"].includes(o.glass)) clean.glass = o.glass;
  base.clockOptions = safeClockOptions(base.clockId, clean);
  base.backgroundOptions = {};
  const bo = p.backgroundOptions ?? {};
  for (const c of uniformControls) {
    const val = bo[c.key];
    if (typeof val === "number" && Number.isFinite(val))
      (base.backgroundOptions as Record<string, unknown>)[c.key] = Math.max(
        c.min,
        Math.min(c.max, val),
      );
  }
  if ([0, 1, 2].includes(bo.interpolation as number))
    base.backgroundOptions.interpolation = bo.interpolation;
  if (
    Array.isArray(bo.palette) &&
    bo.palette.length >= 2 &&
    bo.palette.length <= 8 &&
    bo.palette.every(hex)
  )
    base.backgroundOptions.palette = bo.palette;
  base.displayOptions = {
    reduceMotion: p.displayOptions?.reduceMotion === true,
  };
  return base;
}
export function sanitizePreferences(v: unknown): UserPreferences {
  const d = { ...defaultPreferences };
  if (!v || typeof v !== "object") return d;
  const p = v as UserPreferences;
  for (const k of [
    "hour24",
    "seconds",
    "reduceMotion",
    "keepAwake",
    "autoFullscreen",
    "restoreLast",
  ] as const)
    if (typeof p[k] === "boolean") d[k] = p[k];
  if (p.unit === "fahrenheit") d.unit = p.unit;
  for (const key of ["locale", "timezone"] as const) {
    if (typeof p[key] === "string" && p[key].length < 100) {
      try {
        new Intl.DateTimeFormat(
          key === "locale" ? p[key] || undefined : undefined,
          key === "timezone" && p[key] ? { timeZone: p[key] } : {},
        );
        d[key] = p[key];
      } catch {
        /* ignore invalid locale or zone */
      }
    }
  }
  const l = p.weatherLocation;
  if (
    l &&
    typeof l.name === "string" &&
    Number.isFinite(l.latitude) &&
    Number.isFinite(l.longitude) &&
    Math.abs(l.latitude) <= 90 &&
    Math.abs(l.longitude) <= 180
  )
    d.weatherLocation = {
      name: l.name.slice(0, 100),
      latitude: l.latitude,
      longitude: l.longitude,
    };
  return d;
}
export function readState(): SavedState {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (data?.version !== 1) return defaults();
    const preferences = sanitizePreferences(data.preferences);
    return {
      version: 1,
      onboardingComplete:
        data.onboardingComplete === true ||
        (data.onboardingComplete === undefined &&
          Array.isArray(data.recent) &&
          data.recent.some((id: unknown) => typeof id === "string")),
      preset: presetWithWeatherDefaults(
        sanitizePreset(data.preset) ?? defaults().preset,
        preferences.weatherLocation,
      ),
      preferences,
      recent: Array.isArray(data.recent)
        ? data.recent.filter((x: unknown) => typeof x === "string").slice(0, 8)
        : [],
      favorites: Array.isArray(data.favorites)
        ? data.favorites
            .filter((x: unknown) => typeof x === "string")
            .slice(0, 100)
        : [],
      savedFavorites: Array.isArray(data.savedFavorites)
        ? data.savedFavorites
            .map((item: unknown) => sanitizePreset(item))
            .filter(
              (item: KlockyPreset | null): item is KlockyPreset => item !== null,
            )
            .slice(0, 100)
        : [],
      accountSync: sanitizeAccountSync(data.accountSync),
    };
  } catch {
    return defaults();
  }
}
export function writeState(value: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function encodePreset(p: KlockyPreset) {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function presetConfigurationKey(p: KlockyPreset) {
  const clean = sanitizePreset(p);
  if (!clean) return "";
  return encodePreset({ ...clean, id: "config", name: "config" });
}

export function snapshotFavoritePreset(p: KlockyPreset): KlockyPreset {
  const clean = sanitizePreset(p) ?? structuredClone(p);
  const key = presetConfigurationKey(clean);
  return {
    ...clean,
    id: `saved-${key.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "") || "clock"}`,
    name: clean.name.slice(0, 80) || "My clock",
  };
}

export function presetsMatchConfiguration(a: KlockyPreset, b: KlockyPreset) {
  const left = presetConfigurationKey(a);
  return left !== "" && left === presetConfigurationKey(b);
}
export function decodePreset(s: string): KlockyPreset | null {
  if (s.length > 10000) return null;
  try {
    return sanitizePreset(
      JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(
            atob(s.replaceAll("-", "+").replaceAll("_", "/")),
            (c) => c.charCodeAt(0),
          ),
        ),
      ),
    );
  } catch {
    return null;
  }
}
export function routePreset() {
  const q = new URLSearchParams(location.search);
  const shared = q.get("s");
  if (shared) return decodePreset(shared);
  return presets.find((p) => p.id === q.get("preset")) ?? null;
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportBackground(
  id: string,
  name: string,
  algorithm: string,
  options: BackgroundOptions,
) {
  return {
    id,
    name,
    family: "Lab",
    algorithm,
    fragmentShader: algorithm,
    defaultUniforms: options,
    customizableUniforms: uniformControls,
    suggestedClockColors: ["#fffaf0", "#272923"],
    previewImage: `/posters/${id}.webp`,
    premium: false,
    reducedMotionFallback: `/posters/${id}.webp`,
  };
}
