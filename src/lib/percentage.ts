/**
 * Percentage helpers:
 * - "20% of 150"       → 30
 * - "what % is 30 of 200" → 15%
 * - "15 as % of 200"   → 7.5%
 * - "100 + 15%"        → 115 (add percentage)
 * - "100 - 15%"        → 85  (subtract percentage)
 */

import { getUserLocale } from "./locale";

function fmt(n: number): string {
  return parseFloat(n.toPrecision(10)).toLocaleString(getUserLocale().language, { maximumFractionDigits: 6 });
}

export function tryPercentage(input: string): { result: string; label: string } | null {
  const s = input.trim();
  let m: RegExpMatchArray | null;

  // "20% of 150"
  m = s.match(/^([\d,._]+)\s*%\s*of\s+([\d,._]+)$/i);
  if (m) {
    const pct = parseFloat(m[1].replace(/[,_]/g, ""));
    const base = parseFloat(m[2].replace(/[,_]/g, ""));
    if (isNaN(pct) || isNaN(base)) return null;
    return { result: fmt(base * pct / 100), label: `${m[1]}% of ${m[2]}` };
  }

  // "what % is 30 of 200" / "what percent is 30 of 200"
  m = s.match(/^what\s+(?:%|percent|percentage)\s+is\s+([\d,._]+)\s+of\s+([\d,._]+)$/i);
  if (m) {
    const part = parseFloat(m[1].replace(/[,_]/g, ""));
    const whole = parseFloat(m[2].replace(/[,_]/g, ""));
    if (isNaN(part) || isNaN(whole) || whole === 0) return null;
    return { result: `${fmt(part / whole * 100)}%`, label: `${m[1]} is what % of ${m[2]}` };
  }

  // "30 as % of 200" / "30 as percent of 200"
  m = s.match(/^([\d,._]+)\s+as\s+(?:%|percent|percentage)\s+of\s+([\d,._]+)$/i);
  if (m) {
    const part = parseFloat(m[1].replace(/[,_]/g, ""));
    const whole = parseFloat(m[2].replace(/[,_]/g, ""));
    if (isNaN(part) || isNaN(whole) || whole === 0) return null;
    return { result: `${fmt(part / whole * 100)}%`, label: `${m[1]} as % of ${m[2]}` };
  }

  // "100 + 15%" (add percentage)
  m = s.match(/^([\d,._]+)\s*\+\s*([\d,._]+)\s*%$/);
  if (m) {
    const base = parseFloat(m[1].replace(/[,_]/g, ""));
    const pct = parseFloat(m[2].replace(/[,_]/g, ""));
    if (isNaN(base) || isNaN(pct)) return null;
    return { result: fmt(base * (1 + pct / 100)), label: `${m[1]} + ${m[2]}%` };
  }

  // "100 - 15%" (subtract percentage)
  m = s.match(/^([\d,._]+)\s*-\s*([\d,._]+)\s*%$/);
  if (m) {
    const base = parseFloat(m[1].replace(/[,_]/g, ""));
    const pct = parseFloat(m[2].replace(/[,_]/g, ""));
    if (isNaN(base) || isNaN(pct)) return null;
    return { result: fmt(base * (1 - pct / 100)), label: `${m[1]} - ${m[2]}%` };
  }

  return null;
}
