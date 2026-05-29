import { describe, it, expect } from "vitest";
import { getWidget } from "./registry";
import { resolveConfig } from "./config";
import { clampSize } from "./types";

describe("clampSize", () => {
  const system = getWidget("system")!; // min 4×2, max 8×4

  it("clamps below the minimum up to the min", () => {
    expect(clampSize({ w: 1, h: 1 }, system)).toEqual({ w: 4, h: 2 });
  });

  it("clamps above the maximum (and never past the grid width)", () => {
    expect(clampSize({ w: 99, h: 99 }, system)).toEqual({ w: 8, h: 4 });
  });

  it("leaves an in-bounds size untouched", () => {
    expect(clampSize({ w: 5, h: 3 }, system)).toEqual({ w: 5, h: 3 });
  });
});

describe("resolveConfig", () => {
  const clock = getWidget("clock")!; // defaults: hour12 false, showSeconds false

  it("returns registry defaults when nothing is saved", () => {
    expect(resolveConfig(clock, { id: "clock" })).toEqual({ hour12: false, showSeconds: false });
  });

  it("overlays saved values over the defaults", () => {
    expect(resolveConfig(clock, { id: "clock", config: { hour12: true } })).toEqual({
      hour12: true,
      showSeconds: false,
    });
  });

  it("ignores saved keys the widget no longer declares", () => {
    const out = resolveConfig(clock, { id: "clock", config: { hour12: true, bogus: "x" } });
    expect(out).toEqual({ hour12: true, showSeconds: false });
    expect("bogus" in out).toBe(false);
  });
});
