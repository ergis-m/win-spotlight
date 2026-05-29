import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps a WMO weather-interpretation code (as returned by Open-Meteo) to a
 * label and a lucide icon. Codes that have a distinct look at night supply a
 * separate night icon; everything else reuses the day icon.
 *
 * Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
interface WeatherCode {
  label: string;
  day: LucideIcon;
  night?: LucideIcon;
}

const CODES: Record<number, WeatherCode> = {
  0: { label: "Clear", day: Sun, night: Moon },
  1: { label: "Mainly clear", day: Sun, night: Moon },
  2: { label: "Partly cloudy", day: CloudSun, night: CloudMoon },
  3: { label: "Overcast", day: Cloud },
  45: { label: "Fog", day: CloudFog },
  48: { label: "Rime fog", day: CloudFog },
  51: { label: "Light drizzle", day: CloudDrizzle },
  53: { label: "Drizzle", day: CloudDrizzle },
  55: { label: "Heavy drizzle", day: CloudDrizzle },
  56: { label: "Freezing drizzle", day: CloudDrizzle },
  57: { label: "Freezing drizzle", day: CloudDrizzle },
  61: { label: "Light rain", day: CloudRain },
  63: { label: "Rain", day: CloudRain },
  65: { label: "Heavy rain", day: CloudRain },
  66: { label: "Freezing rain", day: CloudRain },
  67: { label: "Freezing rain", day: CloudRain },
  71: { label: "Light snow", day: CloudSnow },
  73: { label: "Snow", day: CloudSnow },
  75: { label: "Heavy snow", day: CloudSnow },
  77: { label: "Snow grains", day: CloudSnow },
  80: { label: "Light showers", day: CloudRain },
  81: { label: "Showers", day: CloudRain },
  82: { label: "Heavy showers", day: CloudRain },
  85: { label: "Snow showers", day: CloudSnow },
  86: { label: "Snow showers", day: CloudSnow },
  95: { label: "Thunderstorm", day: CloudLightning },
  96: { label: "Thunderstorm", day: CloudLightning },
  99: { label: "Thunderstorm", day: CloudLightning },
};

const FALLBACK: WeatherCode = { label: "—", day: Cloud };

export interface WeatherLook {
  label: string;
  icon: LucideIcon;
}

export function lookForCode(code: number, isDay: boolean): WeatherLook {
  const entry = CODES[code] ?? FALLBACK;
  const icon = isDay ? entry.day : (entry.night ?? entry.day);
  return { label: entry.label, icon };
}
