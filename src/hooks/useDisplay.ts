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
/** Home-screen / installed PWA — immersive without the Fullscreen API (typical on iOS). */
export function isStandaloneDisplay() {
  if (typeof matchMedia !== "function") return false;
  if (matchMedia("(display-mode: standalone)").matches) return true;
  if (matchMedia("(display-mode: minimal-ui)").matches) return true;
  return (
    typeof navigator !== "undefined" &&
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  );
}
export function supportsDocumentFullscreen() {
  return (
    typeof document !== "undefined" &&
    !!document.documentElement.requestFullscreen
  );
}
export const canUseDocumentFullscreen = supportsDocumentFullscreen;
/** In-browser environments where home-screen install is the immersive path. */
export function shouldOfferInstall() {
  return !isStandaloneDisplay() && !supportsDocumentFullscreen();
}
/** Show enter/exit fullscreen when the API works or the user can still install. */
export function shouldShowFullscreenControl() {
  return supportsDocumentFullscreen() || shouldOfferInstall();
}
export type FullscreenResult =
  | "entered"
  | "exited"
  | "install-needed"
  | "noop";
export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
export function isIosSafariBrowser() {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
}
export async function fullscreen(
  notify: (text: string) => void,
): Promise<FullscreenResult> {
  if (isStandaloneDisplay() && !supportsDocumentFullscreen()) return "noop";
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return "exited";
    }
    if (supportsDocumentFullscreen()) {
      await document.documentElement.requestFullscreen();
      return "entered";
    }
    if (shouldOfferInstall()) return "install-needed";
  } catch {
    if (isStandaloneDisplay()) return "noop";
    notify(
      "This browser couldn’t enter fullscreen. Try its fullscreen menu or install Klocky.",
    );
  }
  return "noop";
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
