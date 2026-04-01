/**
 * Date/time math: "today + 30 days", "days until Dec 25", "days between Jan 1 and Mar 15", etc.
 */

function parseDate(str: string): Date | null {
  const s = str.trim().toLowerCase();

  if (s === "today" || s === "now") return new Date();
  if (s === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (s === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  // Try native parse for things like "Dec 25", "2025-01-15", "Jan 1 2026", "March 15"
  const parsed = new Date(str.trim());
  if (!isNaN(parsed.getTime())) {
    // If no year was specified and the date is in the past, assume next year
    if (!/\d{4}/.test(str.trim())) {
      const now = new Date();
      if (parsed < now) {
        parsed.setFullYear(parsed.getFullYear() + 1);
      }
    }
    return parsed;
  }

  return null;
}

type DurationUnit = "day" | "week" | "month" | "year" | "hour" | "minute";

function parseDuration(str: string): { value: number; unit: DurationUnit } | null {
  const m = str.trim().match(/^(\d+)\s*(days?|weeks?|months?|years?|hours?|hrs?|minutes?|mins?)$/i);
  if (!m) return null;
  const value = parseInt(m[1]);
  const u = m[2].toLowerCase();
  if (u.startsWith("day")) return { value, unit: "day" };
  if (u.startsWith("week")) return { value, unit: "week" };
  if (u.startsWith("month")) return { value, unit: "month" };
  if (u.startsWith("year")) return { value, unit: "year" };
  if (u.startsWith("hour") || u.startsWith("hr")) return { value, unit: "hour" };
  if (u.startsWith("min")) return { value, unit: "minute" };
  return null;
}

function addDuration(date: Date, dur: { value: number; unit: DurationUnit }, sign: 1 | -1): Date {
  const d = new Date(date);
  const v = dur.value * sign;
  switch (dur.unit) {
    case "day": d.setDate(d.getDate() + v); break;
    case "week": d.setDate(d.getDate() + v * 7); break;
    case "month": d.setMonth(d.getMonth() + v); break;
    case "year": d.setFullYear(d.getFullYear() + v); break;
    case "hour": d.setHours(d.getHours() + v); break;
    case "minute": d.setMinutes(d.getMinutes() + v); break;
  }
  return d;
}

import { getUserLocale } from "./locale";

function formatDate(d: Date): string {
  return d.toLocaleDateString(getUserLocale().language, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / msPerDay);
}

export function tryDateMath(input: string): { result: string; label: string } | null {
  const trimmed = input.trim();

  // "days until <date>" / "days since <date>"
  let m = trimmed.match(/^days?\s+(until|to|till|before)\s+(.+)$/i);
  if (m) {
    const target = parseDate(m[2]);
    if (!target) return null;
    const days = daysBetween(new Date(), target);
    return {
      result: `${Math.abs(days)} days`,
      label: `${days >= 0 ? "Days until" : "Days since"} ${formatDate(target)}`,
    };
  }

  m = trimmed.match(/^days?\s+since\s+(.+)$/i);
  if (m) {
    const target = parseDate(m[1]);
    if (!target) return null;
    const days = daysBetween(target, new Date());
    return { result: `${Math.abs(days)} days`, label: `Days since ${formatDate(target)}` };
  }

  // "days between <date> and <date>"
  m = trimmed.match(/^days?\s+between\s+(.+?)\s+and\s+(.+)$/i);
  if (m) {
    const a = parseDate(m[1]);
    const b = parseDate(m[2]);
    if (!a || !b) return null;
    const days = Math.abs(daysBetween(a, b));
    return { result: `${days} days`, label: `Between ${formatDate(a)} and ${formatDate(b)}` };
  }

  // "<date> + <duration>" or "<date> - <duration>"
  m = trimmed.match(/^(.+?)\s*([+-])\s*(.+)$/);
  if (m) {
    const date = parseDate(m[1]);
    const dur = parseDuration(m[3]);
    if (!date || !dur) return null;
    const sign = m[2] === "+" ? 1 : -1;
    const result = addDuration(date, dur, sign);
    return { result: formatDate(result), label: `${m[1].trim()} ${m[2]} ${m[3].trim()}` };
  }

  return null;
}
