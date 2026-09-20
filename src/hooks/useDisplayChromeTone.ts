import { useEffect, useRef, type RefObject } from "react";
import type { BackgroundOptions } from "../types";
import {
  CHROME_SAMPLE_POINTS,
  averageLuminance,
  decideChromeTone,
  luminanceFromHex,
  type DisplayChromeTone,
} from "../utils/displayChromeTone";

export type DisplayChromeSampler = {
  sampleMeanLuminance: () => number | null;
};

const SAMPLE_INTERVAL_MS = 500;
const BACKGROUND_SETTLE_MS = 800;

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
  const toneRef = useRef<DisplayChromeTone>("on-dark");

  useEffect(() => {
    const player = playerRef.current;
    if (!enabled || !player) return;
    toneRef.current = "on-dark";
    player.setAttribute("data-display-chrome", "on-dark");
  }, [enabled, backgroundId, playerRef]);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let lastSample = 0;
    let cancelled = false;

    const applyTone = (next: DisplayChromeTone) => {
      if (next === toneRef.current) return;
      toneRef.current = next;
      playerRef.current?.setAttribute("data-display-chrome", next);
    };

    const sample = () => {
      const mean = samplerRef.current?.sampleMeanLuminance() ?? null;
      if (mean === null) return;
      applyTone(decideChromeTone(mean, toneRef.current));
    };

    const tick = (now: number) => {
      if (cancelled) return;
      if (!document.hidden && now - lastSample >= SAMPLE_INTERVAL_MS) {
        lastSample = now;
        sample();
      }
      frame = requestAnimationFrame(tick);
    };

    const boot = window.setTimeout(() => {
      sample();
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
  fallbackHex: string,
  isFailed: () => boolean,
): DisplayChromeSampler {
  return {
    sampleMeanLuminance: () => {
      if (isFailed()) {
        return luminanceFromHex(fallbackHex);
      }
      const renderer = getRenderer();
      if (!renderer) return luminanceFromHex(fallbackHex);
      const samples: [number, number, number][] = [];
      for (const [nx, ny] of CHROME_SAMPLE_POINTS) {
        const pixel = renderer.readPixel(nx, ny);
        if (pixel) samples.push(pixel);
      }
      if (!samples.length) return null;
      return averageLuminance(samples);
    },
  };
}
