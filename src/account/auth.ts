import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { accountSyncAvailable, getSupabase } from "./supabaseClient";

export type AccountSession = { userId: string; email?: string } | null;

function toSession(session: Session | null): AccountSession {
  if (!session?.user.id) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? undefined,
  };
}

export async function getSession(): Promise<AccountSession> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return toSession(data.session);
}

export function subscribeAuth(
  listener: (session: AccountSession, event: AuthChangeEvent) => void,
) {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    listener(toSession(session), event);
  });
  return () => subscription.unsubscribe();
}

export async function startSignUp(
  email: string,
): Promise<{ ok: boolean; message: string }> {
  if (!accountSyncAvailable()) {
    return {
      ok: false,
      message:
        "Sign-in isn’t available on this version yet. Favorites still save on this device.",
    };
  }
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: "Could not connect to sync." };
  }
  const redirectTo = `${location.origin}${location.pathname}${location.search}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return {
    ok: true,
    message: `Check ${trimmed} for a sign-in link. This tab will sync when you open it.`,
  };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
