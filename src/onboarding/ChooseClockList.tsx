import { forwardRef, useImperativeHandle, useRef } from "react";
import { ArrowRight } from "lucide-react";
import type { KlockyPreset, UserPreferences } from "../types";
import { ClockPreview } from "./ClockCarousel";
import { welcomeClocks } from "./presets";
import { uiPx } from "../utils/uiScale";

export interface ClockListSelection {
  preset: KlockyPreset;
  element: HTMLElement;
}

export interface ChooseClockListHandle {
  first: () => ClockListSelection | null;
  random: () => ClockListSelection | null;
}

export function randomClockIndex(count: number, random = Math.random) {
  return Math.min(count - 1, Math.floor(random() * count));
}

export const ChooseClockList = forwardRef<
  ChooseClockListHandle,
  {
    preferences: UserPreferences;
    reduced: boolean;
    onChoose: (selection: ClockListSelection) => void;
  }
>(function ChooseClockList({ preferences, reduced, onChoose }, handle) {
  const list = useRef<HTMLDivElement>(null);

  function selectionAt(index: number): ClockListSelection | null {
    const element = list.current?.querySelector<HTMLElement>(
      `[data-clock-index="${index}"] .onboarding-clock-surface`,
    );
    return element ? { preset: welcomeClocks[index], element } : null;
  }

  useImperativeHandle(handle, () => ({
    first: () => selectionAt(0),
    random: () => selectionAt(randomClockIndex(welcomeClocks.length)),
  }));

  function chooseAt(index: number) {
    const selection = selectionAt(index);
    if (selection) onChoose(selection);
  }

  return (
    <section className="onboarding-clock-list" aria-label="Choose a clock">
      <div ref={list} className="onboarding-clock-list-inner">
        {welcomeClocks.map((preset, index) => (
          <article
            className="onboarding-clock-list-item"
            data-clock-index={index}
            key={preset.id}
          >
            <button
              type="button"
              className="onboarding-clock-list-surface-hit"
              aria-label={`Start with ${preset.name} clock`}
              onClick={() => chooseAt(index)}
            >
              <ClockPreview
                preset={preset}
                preferences={preferences}
                reduced={reduced}
              />
            </button>
            <div className="onboarding-clock-list-meta">
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{preset.name}</h2>
              </div>
              <button
                className="onboarding-clock-cta"
                onClick={() => chooseAt(index)}
              >
                Start with this clock <ArrowRight size={uiPx(15)} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});
