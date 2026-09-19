import { useEffect, useState } from "react";
export function useReducedMotion(extra: boolean) {
  const [system, setSystem] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => setSystem(m.matches);
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, []);
  return extra || system;
}
export async function fullscreen(notify: (text: string) => void) {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else
      notify(
        "Fullscreen isn’t available here. Add Klocky to your Home Screen for an immersive display.",
      );
  } catch {
    notify(
      "This browser couldn’t enter fullscreen. Try its fullscreen menu or install Klocky.",
    );
  }
}
export function useWakeLock(enabled: boolean, notify: (t: string) => void) {
  useEffect(() => {
    if (!enabled) return;
    let lock: WakeLockSentinel | null = null,
      disposed = false,
      pending = false;
    async function request() {
      if (document.hidden || disposed || pending) return;
      if (!("wakeLock" in navigator)) {
        notify(
          "Keep awake isn’t supported in this browser. Your device’s sleep settings still apply.",
        );
        return;
      }
      pending = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed || document.hidden) {
          await next.release();
          return;
        }
        lock = next;
      } catch {
        notify(
          "Keep awake is unavailable right now. Low power mode may prevent it.",
        );
      } finally {
        pending = false;
      }
    }
    void request();
    const show = () => {
      if (!document.hidden && (!lock || lock.released)) void request();
    };
    document.addEventListener("visibilitychange", show);
    return () => {
      disposed = true;
      void lock?.release();
      document.removeEventListener("visibilitychange", show);
    };
  }, [enabled, notify]);
}
