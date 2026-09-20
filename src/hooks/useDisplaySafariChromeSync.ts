import { useEffect, type RefObject } from "react";
import { backgroundStyleForPreset } from "../backgrounds/definitions";
import type { KlockyPreset } from "../types";
import {
  applyDocumentChromeBackground,
} from "../utils/themeColor";
import type { DisplayChromeSampler } from "./useDisplayChromeTone";

const SYNC_MS = 1600;
const BOOT_MS = 400;

/** Mirror the live shader into html/body so iOS Safari chrome matches the clock. */
export function useDisplaySafariChromeSync(
  active: boolean,
  preset: KlockyPreset,
  samplerRef: RefObject<DisplayChromeSampler | null>,
) {
  useEffect(() => {
    if (!active) return;

    const applyPoster = () => {
      applyDocumentChromeBackground(backgroundStyleForPreset(preset), {
        omitColorUnderlay: true,
      });
    };

    applyPoster();

    let interval = 0;
    const syncCapture = () => {
      const canvas = samplerRef.current?.getSampleCanvas();
      if (!canvas || canvas.width < 2 || canvas.height < 2) return;
      try {
        const url = canvas.toDataURL("image/jpeg", 0.84);
        applyDocumentChromeBackground(
          { backgroundImage: `url(${url})`, backgroundColor: "transparent" },
          { liveCapture: true, omitColorUnderlay: true },
        );
      } catch {
        applyPoster();
      }
    };

    const onResize = () => syncCapture();
    const boot = window.setTimeout(() => {
      syncCapture();
      interval = window.setInterval(syncCapture, SYNC_MS);
    }, BOOT_MS);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      clearTimeout(boot);
      clearInterval(interval);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [
    active,
    preset.backgroundId,
    preset.backgroundOptions,
    samplerRef,
  ]);
}
