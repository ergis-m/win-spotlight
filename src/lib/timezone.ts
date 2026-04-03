/**
 * Timezone conversion: "3pm EST in JST", "10:30 UTC to PST", "now in Tokyo"
 */

import { getUserLocale } from "./locale";

// Common abbreviations → IANA timezone
const TZ_MAP: Record<string, string> = {
  // UTC offsets
  utc: "UTC",
  gmt: "UTC",
  // Americas
  est: "America/New_York",
  edt: "America/New_York",
  et: "America/New_York",
  eastern: "America/New_York",
  cst: "America/Chicago",
  cdt: "America/Chicago",
  ct: "America/Chicago",
  central: "America/Chicago",
  mst: "America/Denver",
  mdt: "America/Denver",
  mt: "America/Denver",
  mountain: "America/Denver",
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  pt: "America/Los_Angeles",
  pacific: "America/Los_Angeles",
  akst: "America/Anchorage",
  akdt: "America/Anchorage",
  hst: "Pacific/Honolulu",
  hast: "Pacific/Honolulu",
  brt: "America/Sao_Paulo",
  art: "America/Argentina/Buenos_Aires",
  // Europe
  cet: "Europe/Paris",
  cest: "Europe/Paris",
  eet: "Europe/Helsinki",
  eest: "Europe/Helsinki",
  wet: "Europe/Lisbon",
  west: "Europe/Lisbon",
  "gmt+1": "Europe/Paris",
  "gmt+2": "Europe/Helsinki",
  bst: "Europe/London",
  ist: "Asia/Kolkata",
  // Asia
  jst: "Asia/Tokyo",
  kst: "Asia/Seoul",
  "cst asia": "Asia/Shanghai",
  "cst china": "Asia/Shanghai",
  hkt: "Asia/Hong_Kong",
  sgt: "Asia/Singapore",
  ict: "Asia/Bangkok",
  wib: "Asia/Jakarta",
  pht: "Asia/Manila",
  nzst: "Pacific/Auckland",
  nzdt: "Pacific/Auckland",
  aest: "Australia/Sydney",
  aedt: "Australia/Sydney",
  acst: "Australia/Adelaide",
  acdt: "Australia/Adelaide",
  awst: "Australia/Perth",
  // Cities
  "new york": "America/New_York",
  ny: "America/New_York",
  "los angeles": "America/Los_Angeles",
  la: "America/Los_Angeles",
  chicago: "America/Chicago",
  denver: "America/Denver",
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  amsterdam: "Europe/Amsterdam",
  tokyo: "Asia/Tokyo",
  osaka: "Asia/Tokyo",
  seoul: "Asia/Seoul",
  beijing: "Asia/Shanghai",
  shanghai: "Asia/Shanghai",
  "hong kong": "Asia/Hong_Kong",
  singapore: "Asia/Singapore",
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  auckland: "Pacific/Auckland",
  mumbai: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  dubai: "Asia/Dubai",
  moscow: "Europe/Moscow",
  istanbul: "Europe/Istanbul",
  cairo: "Africa/Cairo",
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",
  "sao paulo": "America/Sao_Paulo",
};

function resolveTz(str: string): string | null {
  const lower = str.trim().toLowerCase();
  if (TZ_MAP[lower]) return TZ_MAP[lower];
  // Try as IANA directly
  try {
    Intl.DateTimeFormat(undefined, { timeZone: str.trim() });
    return str.trim();
  } catch {
    return null;
  }
}

function parseTime(str: string): { hours: number; minutes: number } | null {
  const s = str.trim().toLowerCase();

  if (s === "now" || s === "current" || s === "current time") {
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes() };
  }

  // "3pm", "3:30pm", "15:00", "3:30 pm"
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;

  let hours = parseInt(m[1]);
  const minutes = m[2] ? parseInt(m[2]) : 0;
  const ampm = m[3]?.toLowerCase();

  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;

  return { hours, minutes };
}

function formatTime(date: Date, tz: string): string {
  return date.toLocaleTimeString(getUserLocale().language, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

function formatDatePart(date: Date, tz: string): string {
  return date.toLocaleDateString(getUserLocale().language, {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Patterns:
// "<time> <tz> in|to <tz>"
// "now in <tz>"
const PATTERN = /^(.+?)\s+(?:in|to)\s+(.+?)\s*$/i;

export function tryTimezone(input: string): { result: string; label: string } | null {
  const trimmed = input.trim();

  // "now in Tokyo"
  const nowMatch = trimmed.match(/^now\s+in\s+(.+)$/i);
  if (nowMatch) {
    const tz = resolveTz(nowMatch[1]);
    if (!tz) return null;
    const now = new Date();
    const timeStr = formatTime(now, tz);
    const dateStr = formatDatePart(now, tz);
    const localTz = getUserLocale().timezone;
    const localTime = formatTime(now, localTz);
    return {
      result: `${timeStr} (${dateStr})`,
      label: `${localTime} → ${nowMatch[1].trim()}`,
    };
  }

  const match = trimmed.match(PATTERN);
  if (!match) return null;

  // Split left side into time + source tz
  const leftPart = match[1].trim();
  const targetTzStr = match[2].trim();
  const targetTz = resolveTz(targetTzStr);
  if (!targetTz) return null;

  // Try to split leftPart into "<time> <tz>"
  // Go from right, try each word as a tz
  const words = leftPart.split(/\s+/);
  for (let split = words.length - 1; split >= 1; split--) {
    const timePart = words.slice(0, split).join(" ");
    const tzPart = words.slice(split).join(" ");
    const time = parseTime(timePart);
    const sourceTz = resolveTz(tzPart);
    if (time && sourceTz) {
      // Create a date in the source timezone
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const timeStr = `${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}:00`;

      // Get UTC offset for source timezone
      const sourceDate = new Date(`${dateStr}T${timeStr}`);
      const sourceOffset = getTimezoneOffset(sourceDate, sourceTz);
      const utcMs = sourceDate.getTime() + sourceOffset * 60000;
      const utcDate = new Date(utcMs);

      const resultTime = formatTime(utcDate, targetTz);
      const resultDate = formatDatePart(utcDate, targetTz);

      return {
        result: `${resultTime} (${resultDate})`,
        label: `${timePart} ${tzPart.toUpperCase()} → ${targetTzStr.toUpperCase()}`,
      };
    }
  }

  return null;
}

function getTimezoneOffset(date: Date, tz: string): number {
  // Returns offset in minutes from UTC for the given timezone
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: tz });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}
