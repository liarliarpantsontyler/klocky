import { useLayoutEffect, useRef, useState } from "react";
import { Clock } from "../clock/Clock";
import type { KlockyPreset, UserPreferences, WeatherState } from "../types";

export function ClockStylePreview({
  preset,
  preferences,
  weather,
}: {
  preset: KlockyPreset;
  preferences: UserPreferences;
  weather: WeatherState;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setScale(element.clientWidth / 800);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className="layout-preview" aria-hidden="true">
      <span
        className="layout-preview-stage"
        style={{ transform: `scale(${scale})` }}
      >
        <Clock
          decorative
          preset={{
            ...preset,
            // Neutral ink keeps every style legible on the quiet picker cards.
            clockOptions: { ...preset.clockOptions, color: "#292c27" },
            displayOptions: { ...preset.displayOptions, reduceMotion: true },
          }}
          preferences={preferences}
          weather={weather}
        />
      </span>
    </span>
  );
}
