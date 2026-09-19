import { useEffect, useState } from "react";
import type { WeatherLocation, WeatherState } from "../types";
export function condition(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorms";
}
export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<WeatherLocation[]> {
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`,
    { signal },
  );
  if (!r.ok) throw new Error("City search unavailable");
  const data = await r.json();
  return (data.results ?? []).map(
    (c: {
      name: string;
      admin1?: string;
      country?: string;
      latitude: number;
      longitude: number;
      timezone?: string;
    }) => ({
      name: [c.name, c.admin1 || c.country].filter(Boolean).join(", "),
      latitude: c.latitude,
      longitude: c.longitude,
      timezone: c.timezone,
    }),
  );
}
export function useWeather(
  enabled: boolean,
  location: WeatherLocation | null,
  unit: "celsius" | "fahrenheit",
) {
  const [state, setState] = useState<WeatherState>({ status: "idle" });
  useEffect(() => {
    if (!enabled || !location) {
      setState({ status: "idle" });
      return;
    }
    let stopped = false;
    const abort = new AbortController();
    const cacheKey = `klocky.weather.${location.latitude.toFixed(2)}.${location.longitude.toFixed(2)}.${unit}`;
    async function refresh() {
      if (document.hidden) return;
      try {
        let cached: WeatherState | null = null;
        try {
          cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        } catch {
          /* cache unavailable */
        }
        if (cached?.updatedAt && Date.now() - cached.updatedAt < 900000) {
          setState(cached);
          return;
        }
        setState((s) => ({
          ...s,
          status: s.status === "ready" ? "ready" : "loading",
        }));
        const params = new URLSearchParams({
          latitude: String(location!.latitude),
          longitude: String(location!.longitude),
          current: "temperature_2m,weather_code",
          temperature_unit: unit,
        });
        const r = await fetch(
          "https://api.open-meteo.com/v1/forecast?" + params,
          { signal: abort.signal },
        );
        if (!r.ok) throw new Error("Weather unavailable");
        const data = await r.json();
        if (!Number.isFinite(data.current?.temperature_2m))
          throw new Error("Invalid weather");
        const next: WeatherState = {
          status: "ready",
          temperature: data.current.temperature_2m,
          condition: condition(data.current.weather_code),
          location: location!.name,
          updatedAt: Date.now(),
        };
        if (!stopped) {
          setState(next);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(next));
          } catch {
            /* optional cache */
          }
        }
      } catch {
        if (!stopped) setState({ status: "error" });
      }
    }
    void refresh();
    const timer = setInterval(refresh, 900000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      abort.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled, location, unit]);
  return state;
}
