/**
 * Currency conversion using open.er-api.com (free, no API key, 160+ currencies).
 * Caches rates for 1 hour since they update daily.
 */

const CURRENCIES: Record<string, string> = {
  USD: "US Dollar", EUR: "Euro", GBP: "British Pound", JPY: "Japanese Yen",
  CHF: "Swiss Franc", CAD: "Canadian Dollar", AUD: "Australian Dollar",
  NZD: "New Zealand Dollar", SEK: "Swedish Krona", NOK: "Norwegian Krone",
  DKK: "Danish Krone", PLN: "Polish Zloty", CZK: "Czech Koruna",
  HUF: "Hungarian Forint", RON: "Romanian Leu", BGN: "Bulgarian Lev",
  ISK: "Icelandic Króna", TRY: "Turkish Lira",
  BRL: "Brazilian Real", MXN: "Mexican Peso", CNY: "Chinese Yuan",
  HKD: "Hong Kong Dollar", SGD: "Singapore Dollar", THB: "Thai Baht",
  INR: "Indian Rupee", IDR: "Indonesian Rupiah", MYR: "Malaysian Ringgit",
  PHP: "Philippine Peso", KRW: "South Korean Won", ZAR: "South African Rand",
  ALL: "Albanian Lek",
};

// Aliases: symbol or common name → code
const ALIASES: Record<string, string> = {
  "$": "USD", "dollar": "USD", "dollars": "USD",
  "€": "EUR", "euro": "EUR", "euros": "EUR",
  "£": "GBP", "pound": "GBP", "pounds": "GBP", "quid": "GBP",
  "¥": "JPY", "yen": "JPY",
  "yuan": "CNY", "rmb": "CNY", "renminbi": "CNY",
  "franc": "CHF", "francs": "CHF",
  "rupee": "INR", "rupees": "INR",
  "won": "KRW", "real": "BRL", "reais": "BRL",
  "lira": "TRY", "krona": "SEK", "krone": "NOK",
  "rand": "ZAR", "baht": "THB", "ringgit": "MYR", "peso": "MXN", "pesos": "MXN",
  "lek": "ALL",
};

export function resolveCode(str: string): string | null {
  const upper = str.toUpperCase();
  if (CURRENCIES[upper]) return upper;
  const lower = str.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  return null;
}

export function getCurrencyName(code: string): string {
  return CURRENCIES[code] ?? code;
}

import { getUserLocale } from "./locale";

// Top currencies shown when user types just "<amount> <currency>".
// User's local currency is prepended at runtime if not already present.
const BASE_TOP_TARGETS = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];

function getTopTargets(): string[] {
  const local = getUserLocale().currency;
  if (BASE_TOP_TARGETS.includes(local)) return BASE_TOP_TARGETS;
  return [local, ...BASE_TOP_TARGETS];
}

// Cache: base currency → { rates, timestamp }
const cache = new Map<string, { rates: Record<string, number>; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getRates(base: string): Promise<Record<string, number> | null> {
  const cached = cache.get(base);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.rates;

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== "success") return null;
    const rates: Record<string, number> = data.rates;
    cache.set(base, { rates, ts: Date.now() });
    return rates;
  } catch {
    return null;
  }
}

export function fmt(n: number, code: string): string {
  const noDecimals = ["JPY", "KRW", "HUF", "ISK", "IDR"].includes(code);
  return parseFloat(n.toPrecision(10)).toLocaleString(getUserLocale().language, {
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  });
}

export type CurrencyQuery =
  | { kind: "single"; amount: number; from: string; to: string }
  | { kind: "multi"; amount: number; from: string };

// Pattern: "<number> <currency> in|to <currency>"
const SINGLE_PATTERN = /^([\d,._]+)\s*(.+?)\s+(?:in|to|as|=)\s+(.+?)\s*$/i;
// Pattern: "<number> <currency>" (no target — show top conversions)
const MULTI_PATTERN = /^([\d,._]+)\s*(.+?)\s*$/i;

export function parseCurrencyQuery(input: string): CurrencyQuery | null {
  const trimmed = input.trim();

  // Try single conversion first
  const single = trimmed.match(SINGLE_PATTERN);
  if (single) {
    const amount = parseFloat(single[1].replace(/[,_]/g, ""));
    if (isNaN(amount)) return null;
    const from = resolveCode(single[2].trim());
    const to = resolveCode(single[3].trim());
    if (!from || !to || from === to) return null;
    return { kind: "single", amount, from, to };
  }

  // Try multi (just "<amount> <currency>")
  const multi = trimmed.match(MULTI_PATTERN);
  if (multi) {
    const amount = parseFloat(multi[1].replace(/[,_]/g, ""));
    if (isNaN(amount)) return null;
    const from = resolveCode(multi[2].trim());
    if (!from) return null;
    return { kind: "multi", amount, from };
  }

  return null;
}

export type CurrencyResult = { result: string; label: string; code: string };

export async function convertCurrency(query: CurrencyQuery): Promise<CurrencyResult[] | null> {
  const rates = await getRates(query.from);
  if (!rates) return null;

  if (query.kind === "single") {
    const { amount, from, to } = query;
    if (!(to in rates)) return null;
    const converted = amount * rates[to];
    return [{
      result: `${fmt(converted, to)} ${to}`,
      label: `${amount.toLocaleString(getUserLocale().language)} ${from} → ${to}`,
      code: to,
    }];
  }

  // Multi: show top targets (excluding the source currency)
  const { amount, from } = query;
  const targets = getTopTargets().filter((c) => c !== from);
  const results: CurrencyResult[] = [];
  for (const to of targets) {
    if (!(to in rates)) continue;
    const converted = amount * rates[to];
    results.push({
      result: `${fmt(converted, to)} ${to}`,
      label: getCurrencyName(to),
      code: to,
    });
  }
  return results.length > 0 ? results : null;
}
