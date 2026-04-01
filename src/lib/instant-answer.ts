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

export type InstantAnswerType = "calc" | "unit" | "percentage" | "date" | "timezone" | "color" | "currency";

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
  if (color) return color.formats.map((f) => ({
    type: "color" as const,
    result: f.value,
    label: f.label,
    color,
  }));

  return null;
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
