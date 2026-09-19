import { useLayoutEffect, type CSSProperties, type ReactNode } from "react";
import { useTime, timeParts } from "../hooks/useTime";
import { useAspect } from "../hooks/useAspect";
import { SecondHand } from "./SecondHand";
import { ClockInk } from "./ClockInk";
import { clockWords } from "./words";
import {
  CLOCK_SIZE_DEFAULT,
  CLOCK_SIZE_MAX,
  CLOCK_SIZE_MIN,
  fonts,
} from "./definitions";
import type { KlockyPreset, UserPreferences, WeatherState } from "../types";
export function Clock({
  preset,
  preferences,
  weather,
  thumbnail = false,
  decorative = false,
}: {
  preset: KlockyPreset;
  preferences: UserPreferences;
  weather?: WeatherState;
  thumbnail?: boolean;
  decorative?: boolean;
}) {
  const now = useTime(),
    { ref, aspect } = useAspect();
  const o = preset.clockOptions;

  useLayoutEffect(() => {
    const clock = ref.current;
    if (!clock || thumbnail || decorative) return;
    const composition = clock.querySelector<HTMLElement>(".clock-composition");
    if (!composition) return;
    const primarySelectors: Record<string, string> = {
      fold: ".flip-pair",
      orbit: ".analog-face",
      swiss: ".analog-face",
      stack: ".stack-hours",
      editorial: ".time-text",
      sentence: ".sentence-copy",
      mono: ".time-text",
      glass: ".glass-time",
      edge: ".time-text",
      grid: ".grid-hour",
      ticker: ".ticker-time",
      minimal: ".minimal-time",
      words: ".word-clock strong",
      world: ".world-row strong",
    };
    let measuring = false;
    let observer: ResizeObserver;
    const measure = () => {
      if (measuring) return;
      measuring = true;

      // Always measure the designed layout at 100%. Measuring only the main
      // numerals misses dates, seconds, rules, and intentionally offset pieces.
      clock.style.setProperty("--clock-size-scale", "1");
      const primary = clock.querySelector<HTMLElement>(
        primarySelectors[preset.clockId] ?? ".time-text",
      );
      if (!primary) {
        measuring = false;
        return;
      }
      const primaryWidth = primary.offsetWidth;
      const primaryHeight = primary.offsetHeight;
      const designedSize = ["orbit", "swiss"].includes(preset.clockId)
        ? primaryWidth
        : Number.parseFloat(getComputedStyle(primary).fontSize);
      if (
        !Number.isFinite(designedSize) ||
        designedSize <= 0 ||
        primaryWidth <= 0 ||
        primaryHeight <= 0
      ) {
        measuring = false;
        return;
      }

      const value = Math.max(
        CLOCK_SIZE_MIN,
        Math.min(CLOCK_SIZE_MAX, o.fontSize),
      );
      let scale = value / CLOCK_SIZE_DEFAULT;
      if (value > CLOCK_SIZE_DEFAULT) {
        const clockBounds = clock.getBoundingClientRect();
        const visibleParts = Array.from(composition.children).filter(
          (element): element is HTMLElement => {
            if (!(element instanceof HTMLElement)) return false;
            const bounds = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return (
              bounds.width > 0 &&
              bounds.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          },
        );

        for (const part of visibleParts) observer?.observe(part);

        const contentBounds = visibleParts.reduce(
          (bounds, element) => {
            const part = element.getBoundingClientRect();
            return {
              left: Math.min(bounds.left, part.left),
              right: Math.max(bounds.right, part.right),
              top: Math.min(bounds.top, part.top),
              bottom: Math.max(bounds.bottom, part.bottom),
            };
          },
          {
            left: Number.POSITIVE_INFINITY,
            right: Number.NEGATIVE_INFINITY,
            top: Number.POSITIVE_INFINITY,
            bottom: Number.NEGATIVE_INFINITY,
          },
        );
        const centerX = clockBounds.left + clockBounds.width / 2;
        const centerY = clockBounds.top + clockBounds.height / 2;
        const gutter = Math.max(
          4,
          Math.min(clockBounds.width, clockBounds.height) * 0.015,
        );
        const fitCandidates = [
          (centerX - clockBounds.left - gutter) /
            Math.max(1, centerX - contentBounds.left),
          (clockBounds.right - centerX - gutter) /
            Math.max(1, contentBounds.right - centerX),
          (centerY - clockBounds.top - gutter) /
            Math.max(1, centerY - contentBounds.top),
          (clockBounds.bottom - centerY - gutter) /
            Math.max(1, contentBounds.bottom - centerY),
        ];
        const fullViewportScale = Math.max(1, Math.min(4.5, ...fitCandidates));
        const progress =
          (value - CLOCK_SIZE_DEFAULT) / (CLOCK_SIZE_MAX - CLOCK_SIZE_DEFAULT);
        scale = 1 + (fullViewportScale - 1) * progress;
      }
      const visibleSize = designedSize * scale;
      clock.style.setProperty("--clock-size-scale", String(scale));
      clock.dataset.visibleFontSize = String(Math.round(visibleSize));
      measuring = false;
    };
    observer = new ResizeObserver(() => measure());
    observer.observe(clock);
    observer.observe(composition);
    const mutations = new MutationObserver(measure);
    mutations.observe(composition, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    measure();
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [decorative, o.font, o.fontSize, preset.clockId, ref, thumbnail]);

  const t = timeParts(now, o.hour24, preferences.locale, preferences.timezone);
  const id = preset.clockId;
  const ink = (children: ReactNode) => (
    <ClockInk outline={o.fill === "outline"}>{children}</ClockInk>
  );
  const time = ink(
    <>
      {t.hour}
      <span className="colon">:</span>
      {t.minute}
    </>,
  );
  const seconds = o.showSeconds ? (
    <span className="seconds" key={t.second}>
      {t.second}
    </span>
  ) : null;
  const date = o.showDate ? <span className="clock-date">{t.date}</span> : null;
  const weatherText =
    o.showWeather && weather?.status === "ready"
      ? `${Math.round(weather.temperature!)}° ${weather.condition}`
      : "";
  const place = o.showLocation ? preferences.weatherLocation?.name : "";
  const meta = (
    <div className="clock-meta">
      {date}
      {weatherText && <span>{weatherText}</span>}
      {place && <span>{place}</span>}
    </div>
  );
  const angle = (Number(t.hour) % 12) * 30 + Number(t.minute) * 0.5;
  const minute = Number(t.minute) * 6 + Number(t.second) * 0.1;
  let content;
  switch (id) {
    case "words":
      content = (
        <div className="word-clock">
          <span>IT’S</span>
          <strong key={t.hour + t.minute}>
            {ink(clockWords(Number(t.hour), Number(t.minute)))}
          </strong>
          <small>
            {t.period || "RIGHT NOW"}
            {o.showSeconds ? ` / ${t.second}` : ""}
          </small>
        </div>
      );
      break;
    case "world":
      content = (
        <div className="world-clock">
          {[
            [
              preferences.weatherLocation?.name.split(",")[0] || "Here",
              preferences.timezone,
            ],
            ["New York", "America/New_York"],
            ["London", "Europe/London"],
            ["Tokyo", "Asia/Tokyo"],
          ].map(([city, zone], index) => {
            const local = timeParts(now, o.hour24, preferences.locale, zone);
            return (
              <div className="world-row" key={index}>
                <span>
                  {city}
                  <small>{local.date}</small>
                </span>
                <strong>
                  {ink(`${local.hour}:${local.minute}`)}
                  <small>{local.period}</small>
                </strong>
              </div>
            );
          })}
        </div>
      );
      break;
    case "fold":
      content = (
        <>
          <div className={"flip-pair " + o.glass}>
            <div className="flip-block">
              <span key={t.hour}>{ink(t.hour)}</span>
            </div>
            <div className="flip-block">
              <span key={t.minute}>{ink(t.minute)}</span>
              <small>{t.period}</small>
            </div>
          </div>
          {meta}
          {seconds}
        </>
      );
      break;
    case "orbit":
    case "swiss":
      content = (
        <>
          <div
            className={"analog-face " + (id === "swiss" ? "swiss-face" : "")}
          >
            <svg viewBox="0 0 300 300" aria-hidden="true">
              {Array.from({ length: id === "swiss" ? 12 : 60 }, (_, i) => {
                const a = i * (id === "swiss" ? 30 : 6);
                return (
                  <line
                    key={i}
                    x1="150"
                    y1={i % 5 === 0 || id === "swiss" ? 18 : 22}
                    x2="150"
                    y2={i % 5 === 0 || id === "swiss" ? 31 : 26}
                    transform={`rotate(${a} 150 150)`}
                    stroke="currentColor"
                    strokeWidth={id === "swiss" ? 3 : 1}
                    opacity={i % 5 === 0 || id === "swiss" ? 1 : 0.35}
                  />
                );
              })}
              <line
                x1="150"
                y1="155"
                x2="150"
                y2="81"
                transform={`rotate(${angle} 150 150)`}
                stroke="currentColor"
                strokeWidth={id === "swiss" ? 8 : 5}
                strokeLinecap="round"
              />
              <line
                x1="150"
                y1="161"
                x2="150"
                y2="46"
                transform={`rotate(${minute} 150 150)`}
                stroke="currentColor"
                strokeWidth={id === "swiss" ? 5 : 3}
                strokeLinecap="round"
              />
              {o.showSeconds && (
                <SecondHand
                  now={now}
                  reduced={
                    preferences.reduceMotion ||
                    preset.displayOptions.reduceMotion
                  }
                />
              )}
              <circle cx="150" cy="150" r="5" fill="currentColor" />
            </svg>
          </div>
          {meta}
        </>
      );
      break;
    case "stack":
      content = (
        <>
          <div className="stack-hours">{ink(t.hour)}</div>
          <div className="minute-stack">
            <span>
              {ink(String((Number(t.minute) + 59) % 60).padStart(2, "0"))}
            </span>
            <strong key={t.minute}>{ink(t.minute)}</strong>
            <span>
              {ink(String((Number(t.minute) + 1) % 60).padStart(2, "0"))}
            </span>
          </div>
          {meta}
          {seconds}
        </>
      );
      break;
    case "editorial":
      content = (
        <>
          <div className="editorial-date">
            {o.showDate ? t.weekday : "A moment"}
            <br />
            <i>{o.showDate ? t.monthDay : "to yourself."}</i>
          </div>
          <div className="time-text">
            {time}
            {seconds}
          </div>
          <div className="editorial-line" />
          {(weatherText || place) && (
            <div className="editorial-weather">
              {weatherText} {place}
            </div>
          )}
        </>
      );
      break;
    case "sentence":
      content = (
        <div className="sentence-copy">
          {o.showDate ? (
            <>
              {t.weekday},<br />
              {t.monthDay}
              <br />
              <em>at </em>
            </>
          ) : (
            <em>It is </em>
          )}
          <strong>{time}</strong>
          <sup>{t.period}</sup>
          {seconds}
          {(weatherText || place) && (
            <small>
              {weatherText} {place}
            </small>
          )}
        </div>
      );
      break;
    case "mono":
      content = (
        <>
          <span className="mono-label">
            LOCAL TIME / {preferences.timezone || "HERE"}
          </span>
          <div className="time-text">
            {time}
            <span className="mono-seconds">
              {o.showSeconds ? ":" + t.second : ""}
            </span>
          </div>
          <div className="mono-rule" />
          {meta}
          <span className="mono-status">● SYSTEM SYNCHRONIZED</span>
        </>
      );
      break;
    case "glass":
      content = (
        <>
          <div className={"glass-plaque " + o.glass}>
            {meta}
            <div className="glass-time">
              {time}
              {seconds}
            </div>
            <small>{t.period}</small>
          </div>
        </>
      );
      break;
    case "edge":
      content = (
        <>
          {meta}
          <div className="time-text">
            {time}
            {seconds}
          </div>
          <span className="edge-period">{t.period}</span>
        </>
      );
      break;
    case "grid":
      content = (
        <div className="clock-grid">
          <div className="grid-hour">
            {ink(t.hour)}
            <small>HOURS</small>
          </div>
          <div className="grid-minute">
            {ink(t.minute)}
            <small>MINUTES</small>
          </div>
          <div>{o.showDate ? t.weekday : t.period}</div>
          <div>
            {weatherText || place || (o.showDate ? t.monthDay : "LOCAL TIME")}
            {seconds}
          </div>
        </div>
      );
      break;
    case "ticker":
      content = (
        <>
          <div className="ticker-top">
            {o.showDate ? t.date : "THE PRESENT MOMENT"}
          </div>
          <div className="ticker-time">
            {[...t.hour, ...t.minute].map((n, i) => (
              <span className="ticker-cell" key={i}>
                <b key={n}>{ink(n)}</b>
              </span>
            ))}
          </div>
          <div className="ticker-bottom">
            <span>{t.period || "24 HOURS"}</span>
            {seconds}
            <span>{weatherText || place}</span>
          </div>
        </>
      );
      break;
    case "minimal":
      content = (
        <>
          <div className="minimal-time">
            {time}
            {seconds}
          </div>
          {meta}
        </>
      );
      break;
    default:
      content = (
        <>
          <div className="time-text">
            {time}
            {seconds}
          </div>
          {meta}
        </>
      );
  }
  return (
    <div
      ref={ref}
      className={`clock clock-${id} fill-${o.fill} ${thumbnail ? "thumbnail" : ""}`}
      data-aspect={aspect}
      data-testid={decorative ? "clock-preview" : "clock"}
      data-font={o.font}
      style={
        {
          color: o.color,
          opacity: o.opacity,
          fontFamily: fonts[o.font].css,
          fontWeight: o.weight,
          "--clock-color": o.color,
        } as CSSProperties
      }
      role={thumbnail || decorative ? undefined : "img"}
      aria-label={
        thumbnail || decorative
          ? undefined
          : `${t.hour}:${t.minute}${o.showSeconds ? ":" + t.second : ""} ${t.period}${o.showDate ? ", " + t.date : ""}${weatherText ? ", " + weatherText : ""}`
      }
    >
      <div className="clock-composition" aria-hidden="true">
        {content}
      </div>
    </div>
  );
}
