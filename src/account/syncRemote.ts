import { getSupabase } from "./supabaseClient";
import {
  sanitizeSyncPayload,
  toSyncPayload,
  type SyncPayload,
} from "./syncPayload";
import type { SavedState } from "../types";

export async function pullRemotePayload(
  userId: string,
): Promise<SyncPayload | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_sync")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.payload) return null;
  return sanitizeSyncPayload(data.payload);
}

export async function pushRemotePayload(
  userId: string,
  state: SavedState,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const payload = toSyncPayload(state);
  const { error } = await supabase.from("user_sync").upsert(
    {
      user_id: userId,
      payload,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
