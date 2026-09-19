import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  getSession,
  signOut as authSignOut,
  startSignUp,
  subscribeAuth,
  type AccountSession,
} from "../account/auth";
import { accountSyncAvailable } from "../account/supabaseClient";
import { mergeSyncIntoLocal } from "../account/syncPayload";
import { pullRemotePayload, pushRemotePayload } from "../account/syncRemote";
import type { SavedState } from "../types";

export function useAccountSync(
  saved: SavedState,
  setSaved: Dispatch<SetStateAction<SavedState>>,
  notify: (text: string) => void,
) {
  const [session, setSession] = useState<AccountSession>(null);
  const [authReady, setAuthReady] = useState(!accountSyncAvailable());
  const savedRef = useRef(saved);
  const mergingRef = useRef(false);
  const skipPushRef = useRef(true);
  savedRef.current = saved;

  const mergeFromRemote = useCallback(
    async (userId: string, quiet = false) => {
      if (mergingRef.current) return;
      mergingRef.current = true;
      skipPushRef.current = true;
      try {
        const remote = await pullRemotePayload(userId);
        const merged = mergeSyncIntoLocal(savedRef.current, remote);
        setSaved(merged);
        await pushRemotePayload(userId, merged);
        if (!quiet) notify("Favorites synced to your account.");
      } catch {
        notify("Couldn’t sync right now. Your clocks are still saved here.");
      } finally {
        mergingRef.current = false;
        skipPushRef.current = false;
      }
    },
    [notify, setSaved],
  );

  useEffect(() => {
    if (!accountSyncAvailable()) return;
    let active = true;
    void (async () => {
      try {
        const initial = await getSession();
        if (!active) return;
        setSession(initial);
        if (initial) await mergeFromRemote(initial.userId, true);
      } catch {
        if (active) notify("Couldn’t restore your account session.");
      } finally {
        if (active) {
          setAuthReady(true);
          skipPushRef.current = false;
        }
      }
    })();
    const unsub = subscribeAuth((next, event) => {
      setSession(next);
      if (next && event === "SIGNED_IN") void mergeFromRemote(next.userId, false);
      if (event === "SIGNED_OUT") skipPushRef.current = true;
    });
    return () => {
      active = false;
      unsub();
    };
  }, [mergeFromRemote, notify]);

  useEffect(() => {
    const userId = session?.userId;
    if (!authReady || !userId || skipPushRef.current || mergingRef.current)
      return;
    const timer = setTimeout(() => {
      void pushRemotePayload(userId, savedRef.current).catch(() => {
        notify("Couldn’t upload favorites. Will retry on your next change.");
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [saved, session, authReady, notify]);

  const sendMagicLink = useCallback(async (email: string) => {
    return startSignUp(email);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authSignOut();
      setSession(null);
      notify("Signed out. Favorites stay on this device.");
    } catch {
      notify("Couldn’t sign out. Try again.");
    }
  }, [notify]);

  return {
    session,
    authReady,
    syncConfigured: accountSyncAvailable(),
    sendMagicLink,
    signOut,
  };
}
