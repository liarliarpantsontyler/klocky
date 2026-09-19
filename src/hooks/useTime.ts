import { useSyncExternalStore } from "react";
let current = new Date();
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
function tick() {
  current = new Date();
  listeners.forEach((l) => l());
  clearTimeout(timer);
  if (listeners.size && !document.hidden)
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}
function visibility() {
  clearTimeout(timer);
  if (!document.hidden) tick();
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", visibility);
    tick();
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    }
  };
}
export function useTime() {
  return useSyncExternalStore(subscribe, () => current);
}
export function timeParts(
  date: Date,
  hour24: boolean,
  locale: string,
  timezone: string,
) {
  const opts: Intl.DateTimeFormatOptions = timezone
    ? { timeZone: timezone }
    : {};
  const p = new Intl.DateTimeFormat(locale || undefined, {
    ...opts,
    numberingSystem: "latn",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: hour24 ? "h23" : "h12",
  }).formatToParts(date);
  const get = (type: string) => p.find((v) => v.type === type)?.value ?? "";
  return {
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    period: get("dayPeriod"),
    date: new Intl.DateTimeFormat(locale || undefined, {
      ...opts,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date),
    weekday: new Intl.DateTimeFormat(locale || undefined, {
      ...opts,
      weekday: "long",
    }).format(date),
    monthDay: new Intl.DateTimeFormat(locale || undefined, {
      ...opts,
      month: "long",
      day: "numeric",
    }).format(date),
  };
}
