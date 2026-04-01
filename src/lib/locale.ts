/**
 * User locale preferences — auto-detected from browser/OS, overridable via settings.
 * Overrides are persisted in localStorage.
 */

// Country code → default currency
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", NZ: "NZD",
  JP: "JPY", CN: "CNY", KR: "KRW", IN: "INR", BR: "BRL",
  MX: "MXN", ZA: "ZAR", TH: "THB", MY: "MYR", PH: "PHP",
  ID: "IDR", SG: "SGD", HK: "HKD", TW: "TWD", TR: "TRY",
  SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK",
  HU: "HUF", RO: "RON", BG: "BGN", IS: "ISK", CH: "CHF",
  AL: "ALL", RS: "RSD", UA: "UAH", RU: "RUB", IL: "ILS",
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", EG: "EGP",
  NG: "NGN", KE: "KES", AR: "ARS", CL: "CLP", CO: "COP",
  PE: "PEN", VN: "VND", PK: "PKR", BD: "BDT",
  // Eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", PT: "EUR",
  NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", SK: "EUR", SI: "EUR", LT: "EUR", LV: "EUR",
  EE: "EUR", MT: "EUR", CY: "EUR", LU: "EUR", HR: "EUR",
};

export type UserLocale = {
  /** e.g. "en-US" */
  language: string;
  /** IANA timezone, e.g. "America/New_York" */
  timezone: string;
  /** Short tz name, e.g. "EST" */
  timezoneShort: string;
  /** ISO country code, e.g. "US" */
  country: string;
  /** ISO currency code, e.g. "USD" */
  currency: string;
};

export type UserLocaleOverrides = {
  timezone?: string;
  currency?: string;
};

const STORAGE_KEY = "locale-overrides";

function loadOverrides(): UserLocaleOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOverrides(overrides: UserLocaleOverrides): void {
  // Remove keys that are empty or match "auto"
  const clean: UserLocaleOverrides = {};
  if (overrides.timezone && overrides.timezone !== "auto") clean.timezone = overrides.timezone;
  if (overrides.currency && overrides.currency !== "auto") clean.currency = overrides.currency;

  if (Object.keys(clean).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  }
  // Bust cache
  cached = null;
}

export function getOverrides(): UserLocaleOverrides {
  return loadOverrides();
}

/** Detect the system defaults (ignoring overrides). */
export function getSystemDefaults(): { timezone: string; timezoneShort: string; currency: string; country: string; language: string } {
  const language = navigator.language || "en-US";
  const resolved = Intl.DateTimeFormat().resolvedOptions();
  const timezone = resolved.timeZone || "UTC";
  const timezoneShort = new Date().toLocaleTimeString(language, { timeZoneName: "short" })
    .split(" ").pop() || timezone;
  const parts = language.split("-");
  const country = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
  const currency = COUNTRY_CURRENCY[country] || "USD";
  return { timezone, timezoneShort, currency, country, language };
}

let cached: UserLocale | null = null;

export function getUserLocale(): UserLocale {
  if (cached) return cached;

  const sys = getSystemDefaults();
  const overrides = loadOverrides();

  const timezone = overrides.timezone || sys.timezone;
  const timezoneShort = overrides.timezone
    ? shortTzName(overrides.timezone, sys.language)
    : sys.timezoneShort;
  const currency = overrides.currency || sys.currency;

  cached = {
    language: sys.language,
    timezone,
    timezoneShort,
    country: sys.country,
    currency,
  };
  return cached;
}

function shortTzName(tz: string, locale: string): string {
  try {
    return new Date().toLocaleTimeString(locale, { timeZone: tz, timeZoneName: "short" })
      .split(" ").pop() || tz;
  } catch {
    return tz;
  }
}

/** Common timezones for the settings dropdown. */
export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Europe/Helsinki",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Perth",
  "Pacific/Auckland",
  "UTC",
];

/** Common currencies for the settings dropdown. */
export const COMMON_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY",
  "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON",
  "BGN", "ISK", "TRY", "BRL", "MXN", "HKD", "SGD", "THB",
  "INR", "IDR", "MYR", "PHP", "KRW", "ZAR", "ALL",
];

/** Map currency code → display name. */
export const CURRENCY_NAMES: Record<string, string> = {
  USD: "USD — US Dollar", EUR: "EUR — Euro", GBP: "GBP — British Pound",
  JPY: "JPY — Japanese Yen", CHF: "CHF — Swiss Franc", CAD: "CAD — Canadian Dollar",
  AUD: "AUD — Australian Dollar", NZD: "NZD — New Zealand Dollar",
  SEK: "SEK — Swedish Krona", NOK: "NOK — Norwegian Krone",
  DKK: "DKK — Danish Krone", PLN: "PLN — Polish Zloty",
  CZK: "CZK — Czech Koruna", HUF: "HUF — Hungarian Forint",
  RON: "RON — Romanian Leu", BGN: "BGN — Bulgarian Lev",
  ISK: "ISK — Icelandic Króna", TRY: "TRY — Turkish Lira",
  BRL: "BRL — Brazilian Real", MXN: "MXN — Mexican Peso",
  CNY: "CNY — Chinese Yuan", HKD: "HKD — Hong Kong Dollar",
  SGD: "SGD — Singapore Dollar", THB: "THB — Thai Baht",
  INR: "INR — Indian Rupee", IDR: "IDR — Indonesian Rupiah",
  MYR: "MYR — Malaysian Ringgit", PHP: "PHP — Philippine Peso",
  KRW: "KRW — South Korean Won", ZAR: "ZAR — South African Rand",
  ALL: "ALL — Albanian Lek",
};
