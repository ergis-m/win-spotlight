import { describe, expect, it, vi } from "vitest";

vi.mock("./locale", () => ({
  getUserLocale: () => ({
    language: "en-US",
    timezone: "UTC",
    timezoneShort: "UTC",
    country: "US",
    currency: "USD",
  }),
}));

const { tryUnitConversion } = await import("./units");

describe("tryUnitConversion — length", () => {
  it("converts 1 km to meters", () => {
    expect(tryUnitConversion("1 km in m")?.result).toBe("1,000 m");
  });

  it("converts 1 mile to km (within rounding)", () => {
    // 1 mile = 1.609344 km
    expect(tryUnitConversion("1 mile to km")?.result).toBe("1.609344 km");
  });

  it("accepts '=' and 'to' and 'as' and 'in' as conversion words", () => {
    expect(tryUnitConversion("100 cm = m")?.result).toBe("1 m");
    expect(tryUnitConversion("100 cm to m")?.result).toBe("1 m");
    expect(tryUnitConversion("100 cm as m")?.result).toBe("1 m");
    expect(tryUnitConversion("100 cm in m")?.result).toBe("1 m");
  });
});

describe("tryUnitConversion — temperature (non-ratio)", () => {
  it("converts 32°F to 0°C", () => {
    expect(tryUnitConversion("32 f in c")?.result).toBe("0 c");
  });

  it("converts 100°C to 212°F", () => {
    expect(tryUnitConversion("100 c in f")?.result).toBe("212 f");
  });

  it("converts 0°C to 273.15 K", () => {
    expect(tryUnitConversion("0 celsius in kelvin")?.result).toBe("273.15 k");
  });
});

describe("tryUnitConversion — weight", () => {
  it("converts 10 kg to lbs", () => {
    const r = tryUnitConversion("10 kg in lbs");
    expect(r?.result).toMatch(/^22\.046/);
    expect(r?.result).toMatch(/ lb$/);
  });
});

describe("tryUnitConversion — data", () => {
  it("uses binary 1024 for bytes", () => {
    expect(tryUnitConversion("1 mb in kb")?.result).toBe("1,024 kb");
    expect(tryUnitConversion("1 gb in mb")?.result).toBe("1,024 mb");
  });
});

describe("tryUnitConversion — rejection", () => {
  it("rejects cross-group conversions (kg → m)", () => {
    expect(tryUnitConversion("5 kg in m")).toBeNull();
  });

  it("rejects unknown units", () => {
    expect(tryUnitConversion("5 foos in bars")).toBeNull();
  });

  it("rejects input that doesn't match the pattern", () => {
    expect(tryUnitConversion("5 meters")).toBeNull();
    expect(tryUnitConversion("hello world")).toBeNull();
    expect(tryUnitConversion("")).toBeNull();
  });

  it("rejects non-numeric quantities", () => {
    expect(tryUnitConversion("abc kg in lbs")).toBeNull();
  });
});

describe("tryUnitConversion — label", () => {
  it("uses the canonical (first) name of the target unit in label and result", () => {
    const r = tryUnitConversion("1000 g in kilograms");
    // canonical name for the kg group's kilograms entry is "kg"
    expect(r?.result).toBe("1 kg");
    expect(r?.label).toBe("1000 g → kg");
  });
});
