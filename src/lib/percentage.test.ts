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

const { tryPercentage } = await import("./percentage");

describe("tryPercentage — '% of' form", () => {
  it("computes 20% of 150 = 30", () => {
    const r = tryPercentage("20% of 150");
    expect(r).toEqual({ result: "30", label: "20% of 150" });
  });

  it("is case-insensitive on 'OF'", () => {
    expect(tryPercentage("25% OF 80")?.result).toBe("20");
  });

  it("handles decimal percentages", () => {
    expect(tryPercentage("12.5% of 200")?.result).toBe("25");
  });
});

describe("tryPercentage — 'what % is X of Y' form", () => {
  it("answers 'what % is 30 of 200'", () => {
    const r = tryPercentage("what % is 30 of 200");
    expect(r?.result).toBe("15%");
  });

  it("accepts 'percent' and 'percentage' spellings", () => {
    expect(tryPercentage("what percent is 1 of 4")?.result).toBe("25%");
    expect(tryPercentage("what percentage is 1 of 4")?.result).toBe("25%");
  });

  it("returns null when whole is zero (division by zero guard)", () => {
    expect(tryPercentage("what % is 5 of 0")).toBeNull();
  });
});

describe("tryPercentage — 'X as % of Y' form", () => {
  it("computes 15 as % of 200 = 7.5%", () => {
    expect(tryPercentage("15 as % of 200")?.result).toBe("7.5%");
  });
});

describe("tryPercentage — add/subtract percentage", () => {
  it("'100 + 15%' adds the percentage", () => {
    expect(tryPercentage("100 + 15%")?.result).toBe("115");
  });

  it("'100 - 15%' subtracts the percentage", () => {
    expect(tryPercentage("100 - 15%")?.result).toBe("85");
  });

  it("groups thousands in results (en-US)", () => {
    expect(tryPercentage("10000 + 10%")?.result).toBe("11,000");
  });
});

describe("tryPercentage — rejection", () => {
  it.each([
    "",
    "hello",
    "20% of", // incomplete
    "of 150", // missing pct
    "20 + 15", // no % sign
    "20% of abc",
  ])("returns null for %j", (input) => {
    expect(tryPercentage(input)).toBeNull();
  });
});
