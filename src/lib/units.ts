/**
 * Unit conversion: "10kg in lbs", "100cm to inches", "5 miles in km", etc.
 */

type UnitDef = { names: string[]; toBase: (v: number) => number; fromBase: (v: number) => number };
type UnitGroup = { units: UnitDef[] };

const groups: UnitGroup[] = [
  // Length
  {
    units: [
      { names: ["mm", "millimeter", "millimeters", "millimetre", "millimetres"], toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { names: ["cm", "centimeter", "centimeters", "centimetre", "centimetres"], toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { names: ["m", "meter", "meters", "metre", "metres"], toBase: (v) => v, fromBase: (v) => v },
      { names: ["km", "kilometer", "kilometers", "kilometre", "kilometres"], toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { names: ["in", "inch", "inches", "\""], toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { names: ["ft", "foot", "feet", "'"], toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { names: ["yd", "yard", "yards"], toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
      { names: ["mi", "mile", "miles"], toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
    ],
  },
  // Weight
  {
    units: [
      { names: ["mg", "milligram", "milligrams"], toBase: (v) => v / 1_000_000, fromBase: (v) => v * 1_000_000 },
      { names: ["g", "gram", "grams"], toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { names: ["kg", "kilogram", "kilograms", "kilo", "kilos"], toBase: (v) => v, fromBase: (v) => v },
      { names: ["t", "ton", "tons", "tonne", "tonnes"], toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { names: ["oz", "ounce", "ounces"], toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
      { names: ["lb", "lbs", "pound", "pounds"], toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
      { names: ["st", "stone"], toBase: (v) => v * 6.35029, fromBase: (v) => v / 6.35029 },
    ],
  },
  // Temperature (special: not ratio-based, handled via base = Celsius)
  {
    units: [
      { names: ["c", "°c", "celsius"], toBase: (v) => v, fromBase: (v) => v },
      { names: ["f", "°f", "fahrenheit"], toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
      { names: ["k", "kelvin"], toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  // Volume
  {
    units: [
      { names: ["ml", "milliliter", "milliliters", "millilitre", "millilitres"], toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { names: ["l", "liter", "liters", "litre", "litres"], toBase: (v) => v, fromBase: (v) => v },
      { names: ["gal", "gallon", "gallons"], toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 },
      { names: ["qt", "quart", "quarts"], toBase: (v) => v * 0.946353, fromBase: (v) => v / 0.946353 },
      { names: ["pt", "pint", "pints"], toBase: (v) => v * 0.473176, fromBase: (v) => v / 0.473176 },
      { names: ["cup", "cups"], toBase: (v) => v * 0.236588, fromBase: (v) => v / 0.236588 },
      { names: ["floz", "fl oz", "fluid ounce", "fluid ounces"], toBase: (v) => v * 0.0295735, fromBase: (v) => v / 0.0295735 },
      { names: ["tbsp", "tablespoon", "tablespoons"], toBase: (v) => v * 0.0147868, fromBase: (v) => v / 0.0147868 },
      { names: ["tsp", "teaspoon", "teaspoons"], toBase: (v) => v * 0.00492892, fromBase: (v) => v / 0.00492892 },
    ],
  },
  // Speed
  {
    units: [
      { names: ["m/s", "mps"], toBase: (v) => v, fromBase: (v) => v },
      { names: ["km/h", "kmh", "kph", "kmph"], toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      { names: ["mph"], toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
      { names: ["knot", "knots", "kn", "kt"], toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
    ],
  },
  // Data
  {
    units: [
      { names: ["b", "byte", "bytes"], toBase: (v) => v, fromBase: (v) => v },
      { names: ["kb", "kilobyte", "kilobytes"], toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      { names: ["mb", "megabyte", "megabytes"], toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
      { names: ["gb", "gigabyte", "gigabytes"], toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
      { names: ["tb", "terabyte", "terabytes"], toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 },
    ],
  },
  // Time
  {
    units: [
      { names: ["ms", "millisecond", "milliseconds"], toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { names: ["s", "sec", "second", "seconds"], toBase: (v) => v, fromBase: (v) => v },
      { names: ["min", "minute", "minutes"], toBase: (v) => v * 60, fromBase: (v) => v / 60 },
      { names: ["h", "hr", "hour", "hours"], toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { names: ["d", "day", "days"], toBase: (v) => v * 86400, fromBase: (v) => v / 86400 },
      { names: ["wk", "week", "weeks"], toBase: (v) => v * 604800, fromBase: (v) => v / 604800 },
    ],
  },
  // Area
  {
    units: [
      { names: ["sqm", "m2", "m²", "sq m", "square meter", "square meters", "square metre", "square metres"], toBase: (v) => v, fromBase: (v) => v },
      { names: ["sqft", "ft2", "ft²", "sq ft", "square foot", "square feet"], toBase: (v) => v * 0.092903, fromBase: (v) => v / 0.092903 },
      { names: ["sqmi", "mi2", "mi²", "sq mi", "square mile", "square miles"], toBase: (v) => v * 2_589_988, fromBase: (v) => v / 2_589_988 },
      { names: ["ha", "hectare", "hectares"], toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
      { names: ["acre", "acres", "ac"], toBase: (v) => v * 4046.86, fromBase: (v) => v / 4046.86 },
      { names: ["sqkm", "km2", "km²", "sq km", "square kilometer", "square kilometers"], toBase: (v) => v * 1_000_000, fromBase: (v) => v / 1_000_000 },
    ],
  },
];

// Build lookup: name → { group index, unit index }
const lookup = new Map<string, { gi: number; ui: number }>();
for (let gi = 0; gi < groups.length; gi++) {
  for (let ui = 0; ui < groups[gi].units.length; ui++) {
    for (const name of groups[gi].units[ui].names) {
      lookup.set(name.toLowerCase(), { gi, ui });
    }
  }
}

// Sort names by length desc so longer names match first
const allNames = [...lookup.keys()].sort((a, b) => b.length - a.length);

function matchUnit(str: string): { name: string; ref: { gi: number; ui: number } } | null {
  const lower = str.toLowerCase();
  for (const name of allNames) {
    if (lower === name) return { name, ref: lookup.get(name)! };
  }
  return null;
}

import { getUserLocale } from "./locale";

function fmt(n: number): string {
  if (!isFinite(n)) return "∞";
  return parseFloat(n.toPrecision(10)).toLocaleString(getUserLocale().language, { maximumFractionDigits: 6 });
}

// Pattern: "<number> <unit> in|to <unit>"
const PATTERN = /^([\d,._]+)\s*(.+?)\s+(?:in|to|as|=)\s+(.+?)\s*$/i;

export function tryUnitConversion(input: string): { result: string; label: string } | null {
  const match = input.trim().match(PATTERN);
  if (!match) return null;

  const value = parseFloat(match[1].replace(/[,_]/g, ""));
  if (isNaN(value)) return null;

  const fromStr = match[2].trim();
  const toStr = match[3].trim();

  const from = matchUnit(fromStr);
  const to = matchUnit(toStr);
  if (!from || !to) return null;

  // Must be in the same group
  if (from.ref.gi !== to.ref.gi) return null;

  const group = groups[from.ref.gi];
  const base = group.units[from.ref.ui].toBase(value);
  const result = group.units[to.ref.ui].fromBase(base);

  const toLabel = group.units[to.ref.ui].names[0];
  return { result: `${fmt(result)} ${toLabel}`, label: `${match[1]} ${fromStr} → ${toLabel}` };
}
