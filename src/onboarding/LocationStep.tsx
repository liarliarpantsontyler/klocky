import { useEffect, useRef, useState } from "react";
import { Check, LocateFixed, Search } from "lucide-react";
import type { UserPreferences, WeatherLocation } from "../types";
import { searchCities } from "../weather/useWeather";
import { timeParts, useTime } from "../hooks/useTime";
import { uiPx } from "../utils/uiScale";
import {
  resolveCoordinates,
  timezoneList,
  validTimezone,
  zoneDetails,
} from "./location";
const zones = timezoneList();
export function LocationStep({
  preferences,
  onChange,
  onNext,
}: {
  preferences: UserPreferences;
  onChange: (p: Partial<UserPreferences>) => void;
  onNext: () => void;
}) {
  const now = useTime();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoneInput, setZoneInput] = useState(preferences.timezone);
  const [zoneError, setZoneError] = useState("");
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const zone = preferences.timezone;
  const t = timeParts(now, preferences.hour24, preferences.locale, zone);
  const details = zoneDetails(now, zone, preferences.locale);
  const matchingZones =
    query.trim().length > 1
      ? zones
          .filter((z) =>
            z
              .replaceAll("_", " ")
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
          )
          .slice(0, 5)
      : [];
  useEffect(
    () => () => {
      generation.current++;
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    setZoneInput(zone);
  }, [zone]);
  useEffect(() => {
    setResults([]);
    if (!searching || query.trim().length < 2) return;
    const abort = new AbortController();
    request.current = abort;
    const timer = setTimeout(async () => {
      setStatus("Searching…");
      try {
        const cities = await searchCities(query.trim(), abort.signal);
        if (!abort.signal.aborted) {
          setResults(cities);
          setStatus(
            cities.length
              ? ""
              : "No cities found. You can use a timezone below.",
          );
        }
      } catch {
        if (!abort.signal.aborted)
          setStatus(
            "City search is unavailable. Choose a timezone or use your device time.",
          );
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, searching]);
  function choose(location: WeatherLocation | null, timezone: string) {
    generation.current++;
    request.current?.abort();
    setBusy(false);
    setZoneError("");
    onChange({ weatherLocation: location, timezone });
    setSearching(false);
    setQuery("");
    setStatus("");
  }
  function locate() {
    if (!navigator.geolocation) {
      setSearching(true);
      setStatus("Search city or timezone");
      return;
    }
    const current = ++generation.current;
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    setSearching(false);
    setBusy(true);
    setStatus("Finding your place…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (generation.current !== current || abort.signal.aborted) return;
        const timeout = setTimeout(() => abort.abort(), 9000);
        try {
          const result = await resolveCoordinates(
            Math.round(position.coords.latitude * 100) / 100,
            Math.round(position.coords.longitude * 100) / 100,
            abort.signal,
          );
          if (generation.current !== current) return;
          setZoneError("");
          onChange({
            weatherLocation: result.location,
            timezone: result.timezone,
          });
          setStatus(
            result.approximate
              ? "Some location details are unavailable. Check your place and timezone."
              : "",
          );
        } catch {
          if (generation.current === current) {
            setSearching(true);
            setStatus(
              "Location lookup is unavailable. Search city or timezone, or keep your device time.",
            );
          }
        } finally {
          clearTimeout(timeout);
          if (generation.current === current) setBusy(false);
        }
      },
      () => {
        if (generation.current === current) {
          setBusy(false);
          setSearching(true);
          setStatus("Search city or timezone. Your device time already works.");
        }
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
    );
  }
  const cityName =
    preferences.weatherLocation?.name ||
    zone.split("/").at(-1)?.replaceAll("_", " ") ||
    "Device time";
  return (
    <div className="onboarding-location">
      <button className="onboarding-locate" onClick={locate} disabled={busy}>
        <LocateFixed size={uiPx(17)} />
        {busy ? "Finding your location…" : "Use My Location"}
      </button>
      <div className="onboarding-place">
        <div>
          <div className="onboarding-place-heading">
            <strong>{cityName}</strong>
            <span className="onboarding-place-time">
              {t.hour}:{t.minute} {t.period}{" "}
              <span aria-hidden="true">·</span> {details.abbreviation}
            </span>
          </div>
          {preferences.weatherLocation && (
            <small>
              <Check size={uiPx(11)} /> Looks good
            </small>
          )}
        </div>
        <button
          type="button"
          className="onboarding-place-edit"
          onClick={() => {
            generation.current++;
            request.current?.abort();
            setBusy(false);
            setSearching((v) => !v);
            setStatus("");
          }}
        >
          {searching ? "Done" : "Edit"}
        </button>
      </div>
      {searching && (
        <div className="onboarding-search">
          <label>
            <Search size={uiPx(16)} />
            <input
              autoFocus
              type="search"
              aria-label="Search city or timezone"
              placeholder="Search city or timezone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {(results.length > 0 || matchingZones.length > 0) && (
            <div className="onboarding-search-results">
              {results.map((place) => (
                <button
                  key={place.name + place.latitude}
                  onClick={() => {
                    if (place.timezone && validTimezone(place.timezone))
                      choose(place, place.timezone);
                    else
                      setStatus(
                        "This city has no timezone data. Choose its timezone below.",
                      );
                  }}
                >
                  <span>{place.name}</span>
                  <small>{place.timezone?.replaceAll("_", " ")}</small>
                </button>
              ))}
              {matchingZones.map((z) => (
                <button key={z} onClick={() => choose(null, z)}>
                  <span>{z.replaceAll("_", " ")}</span>
                  <small>Timezone</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {status && (
        <p className="onboarding-status" role="status">
          {status}
        </p>
      )}
      <section
        className="onboarding-time-settings"
        aria-label="Time settings"
      >
        <div className="onboarding-time-options">
          <div>
            <span>Time format</span>
            <div className="onboarding-format">
              {[false, true].map((value) => (
                <button
                  key={String(value)}
                  aria-pressed={preferences.hour24 === value}
                  onClick={() => onChange({ hour24: value })}
                >
                  {value ? "24 hour" : "12 hour"}
                </button>
              ))}
            </div>
          </div>
          <label>
            Timezone
            <input
              aria-label="Timezone"
              list="onboarding-timezones"
              value={zoneInput}
              onChange={(e) => {
                const value = e.target.value;
                setZoneInput(value);
                if (validTimezone(value)) {
                  choose(null, value);
                } else setZoneError("Choose a timezone from the list.");
              }}
            />
            <datalist id="onboarding-timezones">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </label>
          {zoneError && <p role="alert">{zoneError}</p>}
          <small>
            {details.offset} ·{" "}
            {details.daylight ? "Daylight saving time" : "Standard time"}.
            Updates automatically.
          </small>
        </div>
      </section>
      <button
        className="onboarding-primary"
        disabled={!!zoneError}
        onClick={onNext}
      >
        Choose a Clock <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
