import { useEffect, type RefObject } from "react";
import type { BackgroundOptions } from "../types";
import {
  decideChromeTone,
  luminanceFromHex,
  normalizedPointUnderElement,
  relativeLuminance,
  type DisplayChromeTone,
} from "../utils/displayChromeTone";

export type DisplayChromeSampler = {
  sampleAt: (nx: number, ny: number) => number | null;
  getSampleCanvas: () => HTMLCanvasElement | null;
};

const SAMPLE_INTERVAL_MS = 500;
const BACKGROUND_SETTLE_MS = 800;
const CHROME_TARGET_SELECTOR = "[data-display-chrome-target]";

function readTone(element: HTMLElement): DisplayChromeTone {
  const value = element.getAttribute("data-display-chrome");
  return value === "on-light" ? "on-light" : "on-dark";
}

export function useDisplayChromeTone(
  playerRef: RefObject<HTMLElement | null>,
  {
    enabled,
    backgroundId,
    samplerRef,
  }: {
    enabled: boolean;
    backgroundId: string;
    backgroundOptions?: Partial<BackgroundOptions>;
    samplerRef: RefObject<DisplayChromeSampler | null>;
  },
) {
  useEffect(() => {
    const player = playerRef.current;
    if (!enabled || !player) return;
    for (const element of player.querySelectorAll<HTMLElement>(
      CHROME_TARGET_SELECTOR,
    )) {
      element.setAttribute("data-display-chrome", "on-dark");
    }
  }, [enabled, backgroundId, playerRef]);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let lastSample = 0;
    let cancelled = false;

    const sampleTargets = () => {
      const player = playerRef.current;
      const sampler = samplerRef.current;
      if (!player || !sampler) return;
      const canvas = sampler.getSampleCanvas();
      const targets = player.querySelectorAll<HTMLElement>(
        CHROME_TARGET_SELECTOR,
      );
      for (const element of targets) {
        let mean: number | null = null;
        if (canvas) {
          const point = normalizedPointUnderElement(element, canvas);
          if (point) mean = sampler.sampleAt(point[0], point[1]);
        } else {
          mean = sampler.sampleAt(0, 0);
        }
        if (mean === null) continue;
        const next = decideChromeTone(mean, readTone(element));
        element.setAttribute("data-display-chrome", next);
      }
    };

    const tick = (now: number) => {
      if (cancelled) return;
      if (!document.hidden && now - lastSample >= SAMPLE_INTERVAL_MS) {
        lastSample = now;
        sampleTargets();
      }
      frame = requestAnimationFrame(tick);
    };

    const boot = window.setTimeout(() => {
      sampleTargets();
      frame = requestAnimationFrame(tick);
    }, BACKGROUND_SETTLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(boot);
      cancelAnimationFrame(frame);
    };
  }, [enabled, backgroundId, playerRef, samplerRef]);
}

export function createShaderChromeSampler(
  getRenderer: () => {
    readPixel: (nx: number, ny: number) => [number, number, number] | null;
  } | null,
  getCanvas: () => HTMLCanvasElement | null,
  fallbackHex: string,
  isFailed: () => boolean,
): DisplayChromeSampler {
  const fallback = () => luminanceFromHex(fallbackHex);
  return {
    getSampleCanvas: getCanvas,
    sampleAt: (nx, ny) => {
      if (isFailed()) return fallback();
      const renderer = getRenderer();
      if (!renderer) return fallback();
      const pixel = renderer.readPixel(nx, ny);
      if (!pixel) return fallback();
      return relativeLuminance(...pixel);
    },
  };
}
