/**
 * Unified instant-answer engine. Checks each provider and returns the first match.
 */

import { tryCalc } from "./calc";
import { tryPercentage } from "./percentage";
import { tryUnitConversion } from "./units";
import { tryDateMath } from "./dates";
import { tryTimezone } from "./timezone";
import { tryColorParse, type ColorResult } from "./colors";
import { parseCurrencyQuery, convertCurrency } from "./currency";
export type InstantAnswerType =
  | "calc"
  | "unit"
  | "percentage"
  | "date"
  | "timezone"
  | "color"
  | "currency";

export type InstantAnswer = {
  type: InstantAnswerType;
  result: string;
  label: string;
  color?: ColorResult;
};

/**
 * Synchronous check — returns immediately for all providers except currency.
 */
export function getInstantAnswer(input: string): InstantAnswer[] | null {
  if (!input.trim()) return null;

  // Percentage before calc (since "100 + 15%" would also match calc)
  const pct = tryPercentage(input);
  if (pct) return [{ type: "percentage", ...pct }];

  // Calculator
  const calc = tryCalc(input);
  if (calc) return [{ type: "calc", result: calc, label: input.trim() }];

  // Unit conversion
  const unit = tryUnitConversion(input);
  if (unit) return [{ type: "unit", ...unit }];

  // Date math
  const date = tryDateMath(input);
  if (date) return [{ type: "date", ...date }];

  // Timezone
  const tz = tryTimezone(input);
  if (tz) return [{ type: "timezone", ...tz }];

  // Color — one row per format
  const color = tryColorParse(input);
  if (color)
    return color.formats.map((f) => ({
      type: "color" as const,
      result: f.value,
      label: f.label,
      color,
    }));

  return null;
}

export type InstantAnswerHint = {
  type: InstantAnswerType;
  example: string;
  description: string;
};

/**
 * Returns contextual hints based on partial input, helping users discover
 * instant answer features. Only returns hints when no instant answer matched.
 */
export function getInstantAnswerHints(input: string): InstantAnswerHint[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];

  const hints: InstantAnswerHint[] = [];

  // Number at the start — suggest calc, percentage, unit, currency
  const startsWithNumber = /^\d/.test(q);
  const hasUnit = /\d\s*[a-z]+$/i.test(q);
  const endsWithPercent = /%/.test(q);

  if (
    startsWithNumber &&
    endsWithPercent &&
    !q.includes(" of ") &&
    !q.includes("+") &&
    !q.includes("-")
  ) {
    hints.push({
      type: "percentage",
      example: `${q.replace(/%.*/, "")}% of 200`,
      description: "Calculate percentage",
    });
  }

  if (startsWithNumber && hasUnit && !q.includes(" in ") && !q.includes(" to ")) {
    // Extract number + unit to build a conversion hint
    const m = q.match(/^([\d.]+)\s*([a-z]+)$/i);
    if (m) {
      const unitHints: Record<string, string> = {
        kg: "lbs",
        lbs: "kg",
        lb: "kg",
        mi: "km",
        km: "mi",
        ft: "m",
        m: "ft",
        cm: "in",
        in: "cm",
        oz: "g",
        g: "oz",
        l: "gal",
        gal: "l",
        f: "c",
        c: "f",
        mph: "km/h",
        "km/h": "mph",
        gb: "mb",
        tb: "gb",
        mb: "kb",
        usd: "eur",
        eur: "usd",
        gbp: "usd",
        jpy: "usd",
      };
      const target = unitHints[m[2].toLowerCase()];
      if (target) {
        hints.push({
          type: "unit",
          example: `${m[1]}${m[2]} in ${target}`,
          description: "Convert units",
        });
      }
    }
  }

  if (startsWithNumber && !hasUnit && !endsWithPercent && q.length <= 6) {
    // Pure number — suggest a few things
    const num = q.replace(/[^0-9.]/g, "");
    if (num) {
      if (!q.includes("+") && !q.includes("-") && !q.includes("*") && !q.includes("/")) {
        hints.push({
          type: "calc",
          example: `${num} * 2 + 10`,
          description: "Calculate expression",
        });
      }
      hints.push({
        type: "currency",
        example: `${num} USD to EUR`,
        description: "Convert currency",
      });
    }
  }

  // Hash → color
  if (q.startsWith("#") && q.length < 7 && q.length > 1) {
    hints.push({
      type: "color",
      example: `${q}${"a4f2c8".slice(q.length - 1)}`,
      description: "Parse color code",
    });
  }
  if (q.startsWith("rgb") && !q.includes(")")) {
    hints.push({ type: "color", example: "rgb(255, 87, 51)", description: "Parse color" });
  }
  if (q.startsWith("hsl") && !q.includes(")")) {
    hints.push({ type: "color", example: "hsl(11, 100%, 60%)", description: "Parse color" });
  }

  // Date keywords
  if (
    ["today", "tomorrow", "yesterday", "now"].some(
      (kw) => kw.startsWith(q) && q.length >= 3 && q !== kw,
    )
  ) {
    const kw = ["today", "tomorrow", "yesterday", "now"].find((k) => k.startsWith(q))!;
    hints.push({ type: "date", example: `${kw} + 30 days`, description: "Date math" });
    if (kw === "now") {
      hints.push({
        type: "timezone",
        example: "now in Tokyo",
        description: "Time in another zone",
      });
    }
  }

  // "days" keyword
  if (q.startsWith("days") && q.length < 10 && !q.includes("until") && !q.includes("between")) {
    hints.push({
      type: "date",
      example: "days until Dec 25",
      description: "Count days until a date",
    });
  }

  // Partial timezone: "now in" without a city, or time patterns
  if (/^now in\s*$/i.test(q)) {
    hints.push({
      type: "timezone",
      example: "now in Tokyo",
      description: "Current time in a city",
    });
  }
  if (/^\d{1,2}(:\d{2})?\s*(am|pm)?\s*$/i.test(q)) {
    hints.push({
      type: "timezone",
      example: `${q.trim()} EST in PST`,
      description: "Convert time zones",
    });
  }

  return hints.slice(0, 3);
}

/**
 * Async check for currency (needs network).
 * Only called if sync check returned null.
 */
export async function getAsyncInstantAnswer(input: string): Promise<InstantAnswer[] | null> {
  const parsed = parseCurrencyQuery(input);
  if (!parsed) return null;

  const results = await convertCurrency(parsed);
  if (!results) return null;

  return results.map((r) => ({
    type: "currency" as const,
    result: r.result,
    label: r.label,
  }));
}
