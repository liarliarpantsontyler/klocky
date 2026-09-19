import type { UserPreferences, WeatherLocation } from "../types";
export function devicePreferences(): Pick<
  UserPreferences,
  "timezone" | "hour24" | "locale"
> {
  const format = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
  }).resolvedOptions();
  return {
    timezone: format.timeZone || "UTC",
    hour24: format.hourCycle === "h23" || format.hourCycle === "h24",
    locale: format.locale,
  };
}
export function validTimezone(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return !!zone;
  } catch {
    return false;
  }
}
export function timezoneList(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  return [
    "UTC",
    ...(intl.supportedValuesOf?.("timeZone") ?? [
      "America/Chicago",
      "America/New_York",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Asia/Kolkata",
      "Asia/Tokyo",
      "Australia/Sydney",
    ]),
  ];
}
export function zoneDetails(now: Date, timezone: string, locale = "en-US") {
  const part = (date: Date, style: "short" | "long" | "longOffset") =>
    new Intl.DateTimeFormat(locale || undefined, {
      timeZone: timezone || undefined,
      timeZoneName: style,
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value || "";
  const offset = (date: Date) => {
    const value =
      new Intl.DateTimeFormat("en", {
        timeZone: timezone || undefined,
        timeZoneName: "longOffset",
      })
        .formatToParts(date)
        .find((p) => p.type === "timeZoneName")?.value || "GMT";
    const match = value.match(/GMT([+-])(\d{2}):(\d{2})/);
    return match
      ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "-" ? -1 : 1)
      : 0;
  };
  const year = now.getUTCFullYear();
  const standard = Math.min(
    offset(new Date(Date.UTC(year, 0, 15))),
    offset(new Date(Date.UTC(year, 6, 15))),
  );
  const longName = part(now, "long");
  return {
    abbreviation: part(now, "short"),
    offset: part(now, "longOffset").replace("GMT", "UTC"),
    daylight: /daylight|summer/i.test(longName) || offset(now) > standard,
  };
}
export async function resolveCoordinates(
  latitude: number,
  longitude: number,
  signal: AbortSignal,
): Promise<{
  location: WeatherLocation;
  timezone: string;
  approximate: boolean;
}> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });
  const json = async (url: string) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("Location lookup unavailable");
    return response.json();
  };
  const [place, zone] = await Promise.allSettled([
    json(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}&localityLanguage=en`,
    ),
    json(
      `https://api.open-meteo.com/v1/forecast?${params}&current=temperature_2m&timezone=auto&forecast_days=1`,
    ),
  ]);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const hasZone =
    zone.status === "fulfilled" && validTimezone(zone.value.timezone);
  const timezone =
    hasZone && zone.status === "fulfilled"
      ? zone.value.timezone
      : devicePreferences().timezone;
  const data = place.status === "fulfilled" ? place.value : null;
  const city = data?.city || data?.locality;
  const name = city
    ? [city, data.principalSubdivision || data.countryName]
        .filter(Boolean)
        .join(", ")
    : "Current location";
  return {
    location: { name, latitude, longitude },
    timezone,
    approximate: !city || !hasZone,
  };
}
