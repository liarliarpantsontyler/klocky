import type { KlockyPreset, SavedState, UserPreferences } from "../types";
import {
  presetConfigurationKey,
  presetsMatchConfiguration,
  sanitizePreset,
  sanitizePreferences,
} from "../state/storage";

export type SyncPayload = {
  version: 1;
  favorites: string[];
  savedFavorites: KlockyPreset[];
  preferences: Pick<
    UserPreferences,
    "weatherLocation" | "timezone" | "unit" | "hour24" | "seconds" | "locale"
  >;
};

export function toSyncPayload(state: SavedState): SyncPayload {
  const preferences = sanitizePreferences(state.preferences);
  return {
    version: 1,
    favorites: state.favorites.slice(0, 100),
    savedFavorites: state.savedFavorites.slice(0, 100),
    preferences: {
      weatherLocation: preferences.weatherLocation,
      timezone: preferences.timezone,
      unit: preferences.unit,
      hour24: preferences.hour24,
      seconds: preferences.seconds,
      locale: preferences.locale,
    },
  };
}

export function sanitizeSyncPayload(raw: unknown): SyncPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as SyncPayload;
  if (data.version !== 1) return null;
  const favorites = Array.isArray(data.favorites)
    ? data.favorites.filter((x): x is string => typeof x === "string").slice(0, 100)
    : [];
  const savedFavorites = Array.isArray(data.savedFavorites)
    ? data.savedFavorites
        .map((item) => sanitizePreset(item))
        .filter((item): item is KlockyPreset => item !== null)
        .slice(0, 100)
    : [];
  const base = sanitizePreferences({});
  const incoming = data.preferences ?? {};
  const preferences = sanitizePreferences({ ...base, ...incoming });
  return {
    version: 1,
    favorites,
    savedFavorites,
    preferences: {
      weatherLocation: preferences.weatherLocation,
      timezone: preferences.timezone,
      unit: preferences.unit,
      hour24: preferences.hour24,
      seconds: preferences.seconds,
      locale: preferences.locale,
    },
  };
}

function mergeFavoriteIds(a: string[], b: string[]) {
  const out: string[] = [];
  for (const id of [...a, ...b]) {
    if (typeof id === "string" && !out.includes(id)) out.push(id);
    if (out.length >= 100) break;
  }
  return out;
}

function mergeSavedFavorites(a: KlockyPreset[], b: KlockyPreset[]) {
  const out: KlockyPreset[] = [];
  for (const item of [...a, ...b]) {
    if (out.some((existing) => presetsMatchConfiguration(existing, item)))
      continue;
    out.push(item);
    if (out.length >= 100) break;
  }
  return out;
}

function mergeSyncPreferences(
  local: UserPreferences,
  remote: SyncPayload["preferences"],
): UserPreferences {
  const gap = { ...local };
  if (!gap.timezone && remote.timezone) gap.timezone = remote.timezone;
  if (!gap.locale && remote.locale) gap.locale = remote.locale;
  if (!gap.weatherLocation && remote.weatherLocation)
    gap.weatherLocation = remote.weatherLocation;
  return sanitizePreferences(gap);
}

/** Union favorites + configs; merge sync-related preferences. */
export function mergeSyncIntoLocal(
  local: SavedState,
  remote: SyncPayload | null,
): SavedState {
  if (!remote) return local;
  const favorites = mergeFavoriteIds(local.favorites, remote.favorites);
  const savedFavorites = mergeSavedFavorites(
    local.savedFavorites,
    remote.savedFavorites,
  );
  const preferences = mergeSyncPreferences(local.preferences, remote.preferences);
  return {
    ...local,
    favorites,
    savedFavorites,
    preferences,
  };
}

export function syncPayloadsEqual(a: SyncPayload, b: SyncPayload) {
  if (a.favorites.join("\0") !== b.favorites.join("\0")) return false;
  if (a.savedFavorites.length !== b.savedFavorites.length) return false;
  for (let i = 0; i < a.savedFavorites.length; i++) {
    if (
      presetConfigurationKey(a.savedFavorites[i]) !==
      presetConfigurationKey(b.savedFavorites[i])
    )
      return false;
  }
  return JSON.stringify(a.preferences) === JSON.stringify(b.preferences);
}
