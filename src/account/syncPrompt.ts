import type { AccountSyncMeta, SavedState } from "../types";

export const SYNC_PROMPT_FAVORITE_THRESHOLD = 2;

export const defaultAccountSync = (): AccountSyncMeta => ({
  dismissed: false,
  autoShown: false,
});

export function countSavedFavorites(state: Pick<SavedState, "favorites" | "savedFavorites">) {
  const curated = state.favorites.length;
  const custom = state.savedFavorites.length;
  return curated + custom;
}

export function sanitizeAccountSync(value: unknown): AccountSyncMeta {
  const d = defaultAccountSync();
  if (!value || typeof value !== "object") return d;
  const v = value as AccountSyncMeta;
  if (typeof v.dismissed === "boolean") d.dismissed = v.dismissed;
  if (typeof v.autoShown === "boolean") d.autoShown = v.autoShown;
  return d;
}

/** After a new favorite (not an unfavorite), should we open the sync sheet? */
export function shouldPromptAfterFavoriteAdd(
  state: SavedState,
  wasAdd: boolean,
): boolean {
  if (!wasAdd || state.accountSync.dismissed || state.accountSync.autoShown)
    return false;
  return countSavedFavorites(state) >= SYNC_PROMPT_FAVORITE_THRESHOLD;
}

/** Share link copied while the current clock is favorited. */
export function shouldPromptAfterShareWithFavorite(
  state: SavedState,
  clockIsFavorited: boolean,
): boolean {
  if (!clockIsFavorited || state.accountSync.dismissed || state.accountSync.autoShown)
    return false;
  return countSavedFavorites(state) >= 1;
}
