import { useQuery } from "@tanstack/react-query";

export type TempUnit = "celsius" | "fahrenheit";

export interface WeatherHour {
  /** Epoch ms for the start of this hour, local time. */
  time: number;
  temp: number;
  code: number;
  isDay: boolean;
}

export interface Weather {
  location: string;
  unit: TempUnit;
  current: { temp: number; code: number; isDay: boolean };
  /** The next several hours, starting with the current hour. */
  hourly: WeatherHour[];
}

interface GeoLocation {
  city: string;
  latitude: number;
  longitude: number;
  unit: TempUnit;
}

// Countries that conventionally report temperature in Fahrenheit.
const FAHRENHEIT_REGIONS = new Set(["US", "BS", "BZ", "KY", "PW", "FM", "MH", "LR"]);

const HOURS_AHEAD = 6;

function unitForCountry(country: unknown): TempUnit {
  return typeof country === "string" && FAHRENHEIT_REGIONS.has(country) ? "fahrenheit" : "celsius";
}

/**
 * Free, keyless IP-geolocation providers, tried in order. The location barely
 * changes within a session, so the first success is cached for the lifetime of
 * the window — keeps us well under each provider's rate limit even though the
 * weather widget renders in several places.
 */
interface GeoResponse {
  success?: boolean;
  city?: string;
  latitude?: number | string;
  longitude?: number | string;
  country_code?: string;
}

const GEO_PROVIDERS: { url: string; parse: (d: GeoResponse) => GeoLocation | null }[] = [
  // ipwho.is and ipapi.co return numeric coords; geojs returns strings — Number()
  // normalizes both, and the outer guard rejects anything non-finite.
  { url: "https://ipwho.is/", parse: (d) => (d.success === false ? null : toLocation(d)) },
  { url: "https://get.geojs.io/v1/ip/geo.json", parse: toLocation },
  { url: "https://ipapi.co/json/", parse: toLocation },
];

function toLocation(d: GeoResponse): GeoLocation | null {
  if (d.latitude == null || d.longitude == null) return null;
  return {
    city: d.city ?? "Current location",
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    unit: unitForCountry(d.country_code),
  };
}

let cachedLocation: GeoLocation | null = null;

/** Resolve approximate location + preferred unit from the caller's IP. */
async function getLocation(): Promise<GeoLocation> {
  if (cachedLocation) return cachedLocation;
  for (const provider of GEO_PROVIDERS) {
    try {
      const res = await fetch(provider.url);
      if (!res.ok) continue;
      const loc = provider.parse(await res.json());
      if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
        cachedLocation = loc;
        return loc;
      }
    } catch {
      // Try the next provider.
    }
  }
  throw new Error("Could not determine location");
}

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    is_day: number[];
  };
}

/** A user-chosen unit, or "auto" to use the IP-derived regional default. */
export type UnitPreference = TempUnit | "auto";

export async function getWeather(unitPref: UnitPreference = "auto"): Promise<Weather> {
  const loc = await getLocation();
  const unit: TempUnit = unitPref === "auto" ? loc.unit : unitPref;
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: "temperature_2m,weather_code,is_day",
    hourly: "temperature_2m,weather_code,is_day",
    temperature_unit: unit,
    timezone: "auto",
    forecast_days: "2",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
  const data: OpenMeteoResponse = await res.json();

  // Open-Meteo returns timezone-local timestamps without an offset; parsing as
  // local Date lines them up with the user's clock for "now" selection.
  const times = data.hourly.time.map((t) => new Date(t).getTime());
  const now = Date.now();
  let start = times.findIndex((t) => t + 3600_000 > now);
  if (start < 0) start = 0;

  const hourly: WeatherHour[] = times.slice(start, start + HOURS_AHEAD).map((time, i) => {
    const idx = start + i;
    return {
      time,
      temp: data.hourly.temperature_2m[idx],
      code: data.hourly.weather_code[idx],
      isDay: data.hourly.is_day[idx] === 1,
    };
  });

  return {
    location: loc.city,
    unit,
    current: {
      temp: data.current.temperature_2m,
      code: data.current.weather_code,
      isDay: data.current.is_day === 1,
    },
    hourly,
  };
}

export function useWeather(unitPref: UnitPreference = "auto") {
  return useQuery({
    queryKey: ["weather", unitPref],
    queryFn: () => getWeather(unitPref),
    // Conditions move slowly; refresh every 10 min and keep last value fresh
    // enough that re-mounting the widget doesn't refetch immediately.
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
