import { useState, useEffect, useRef } from "react";
import { LocateFixed, Search } from "lucide-react";
import type { UserPreferences, WeatherLocation, WeatherState } from "../types";
import { searchCities } from "../weather/useWeather";
import { uiPx } from "../utils/uiScale";
export function WeatherControls({
  preferences,
  onChange,
  weather,
  onLocationSelected,
}: {
  preferences: UserPreferences;
  onChange: (p: Partial<UserPreferences>) => void;
  weather: WeatherState;
  onLocationSelected?: () => void;
}) {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<WeatherLocation[]>([]),
    [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) {
      setStatus("Enter at least two letters.");
      return;
    }
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    setStatus("Finding places…");
    try {
      const r = await searchCities(query.trim(), abort.signal);
      setResults(r);
      setStatus(
        r.length
          ? "Choose your city below."
          : "No cities found. Try a nearby city.",
      );
    } catch {
      if (!abort.signal.aborted)
        setStatus("City search is unavailable. Please try again.");
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setStatus(
        "Location is unavailable in this browser. Search a city instead.",
      );
      return;
    }
    setStatus("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange({
          weatherLocation: {
            name: "Current location",
            latitude: Math.round(p.coords.latitude * 100) / 100,
            longitude: Math.round(p.coords.longitude * 100) / 100,
          },
        });
        onLocationSelected?.();
        setStatus("Location saved on this device.");
      },
      () =>
        setStatus("Location was not available. You can choose a city instead."),
      { timeout: 15000, maximumAge: 600000 },
    );
  }
  return (
    <div className="weather-controls">
      <p className="help-text">
        Choose a city or share your approximate location with Open-Meteo. Photos
        and clock preferences stay on this device.
      </p>
      <form className="search-field" onSubmit={search}>
        <Search size={uiPx(16)} />
        <input
          aria-label="Search city"
          placeholder="Search for a city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Find</button>
      </form>
      {results.map((r) => (
        <button
          className="city-result"
          key={r.name + r.latitude}
          onClick={() => {
            onChange({ weatherLocation: r });
            onLocationSelected?.();
            setResults([]);
            setStatus("City saved.");
          }}
        >
          {r.name}
        </button>
      ))}
      <button className="text-button" onClick={locate}>
        <LocateFixed size={uiPx(15)} /> Use my location
      </button>
      {preferences.weatherLocation && (
        <div className="location-status">
          <span>{preferences.weatherLocation.name}</span>
          <button onClick={() => onChange({ weatherLocation: null })}>
            Clear
          </button>
        </div>
      )}
      <p className="help-text" role="status">
        {status ||
          {
            idle: "Choose a location to show weather.",
            loading: "Updating weather…",
            ready: "Weather updates every 15 minutes.",
            error:
              "Weather is unavailable. Your clock will keep its quiet layout.",
          }[weather.status]}
      </p>
      <label className="select-row">
        Temperature
        <select
          aria-label="Temperature unit"
          value={preferences.unit}
          onChange={(e) =>
            onChange({ unit: e.target.value as UserPreferences["unit"] })
          }
        >
          <option value="celsius">Celsius · °C</option>
          <option value="fahrenheit">Fahrenheit · °F</option>
        </select>
      </label>
      <a
        className="attribution"
        href="https://open-meteo.com/"
        target="_blank"
        rel="noreferrer"
      >
        Weather by Open-Meteo ↗
      </a>
    </div>
  );
}
