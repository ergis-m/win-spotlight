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

const { tryCalc } = await import("./calc");

describe("tryCalc — rejects non-math input", () => {
  it.each([
    ["", "empty string"],
    ["   ", "whitespace only"],
    ["hello", "plain word"],
    ["123", "bare number (no operator)"],
    ["2x3", "letter inside expression"],
    ["2 + ", "trailing operator"],
    ["* 5", "leading binary operator"],
    ["(2 + 3", "unbalanced paren"],
    ["2 + 3)", "stray closing paren"],
    ["2 ++ 3", "double operator"],
    ["2 @ 3", "unknown character"],
  ])("returns null for %j (%s)", (input) => {
    expect(tryCalc(input)).toBeNull();
  });
});

describe("tryCalc — arithmetic", () => {
  it("evaluates basic addition and subtraction", () => {
    expect(tryCalc("2 + 3")).toBe("5");
    expect(tryCalc("10 - 4")).toBe("6");
  });

  it("respects multiplication/division precedence over addition", () => {
    expect(tryCalc("2 + 3 * 4")).toBe("14");
    expect(tryCalc("20 - 6 / 2")).toBe("17");
  });

  it("evaluates parentheses before higher-precedence ops", () => {
    expect(tryCalc("(2 + 3) * 4")).toBe("20");
  });

  it("treats ^ as right-associative exponentiation", () => {
    // 2^(3^2) = 2^9 = 512, not (2^3)^2 = 64
    expect(tryCalc("2 ^ 3 ^ 2")).toBe("512");
  });

  it("handles unary minus in various positions", () => {
    expect(tryCalc("-5 + 2")).toBe("-3");
    expect(tryCalc("3 * -4")).toBe("-12");
    expect(tryCalc("-(2 + 3)")).toBeNull(); // parser doesn't support unary on parens
    expect(tryCalc("2 * (-3 + 1)")).toBe("-4");
  });

  it("supports modulo", () => {
    expect(tryCalc("10 % 3")).toBe("1");
  });

  it("supports decimals and digit separators", () => {
    expect(tryCalc("1.5 + 2.5")).toBe("4");
    expect(tryCalc("1_000 + 1")).toBe("1,001");
  });
});

describe("tryCalc — formatting", () => {
  it("strips trailing zeros and groups thousands (en-US)", () => {
    expect(tryCalc("1000 * 1000")).toBe("1,000,000");
    expect(tryCalc("1 + 1.0")).toBe("2");
  });

  it("limits precision to ~10 significant digits", () => {
    // 1/3 would otherwise be 0.3333333333333333
    expect(tryCalc("1 / 3")).toBe("0.3333333333");
  });

  it("formats division by zero as infinity", () => {
    expect(tryCalc("1 / 0")).toBe("∞");
    expect(tryCalc("-1 / 0")).toBe("-∞");
  });

  // BUG: formatResult checks !isFinite(n) before isNaN(n), so NaN falls through
  // to the ±∞ branch (NaN > 0 is false → "-∞"). Test pinned to current behavior.
  it("currently formats 0/0 as '-∞' (known bug — should be NaN)", () => {
    expect(tryCalc("0 / 0")).toBe("-∞");
  });
});
