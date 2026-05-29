import { describe, it, expect } from "vitest";
import { reconcileLayout } from "./registry";

describe("reconcileLayout", () => {
  it("seeds the default board when empty", () => {
    const out = reconcileLayout([]);
    expect(out.map((e) => e.id)).toEqual(["system", "drives"]);
    expect(out.every((e) => typeof e.w === "number" && typeof e.h === "number")).toBe(true);
  });

  it("drops legacy-disabled entries (and reseeds if that empties the board)", () => {
    const out = reconcileLayout([{ id: "weather", enabled: false }]);
    expect(out.map((e) => e.id)).toEqual(["system", "drives"]);
  });

  it("keeps enabled entries and preserves their order", () => {
    const out = reconcileLayout([{ id: "clock" }, { id: "system" }]);
    expect(out.map((e) => e.id)).toEqual(["clock", "system"]);
  });

  it("filters unknown ids and de-duplicates", () => {
    const out = reconcileLayout([{ id: "nope" }, { id: "clock" }, { id: "clock" }]);
    expect(out.map((e) => e.id)).toEqual(["clock"]);
  });

  it("does not auto-append newly shipped widgets to a curated board", () => {
    const out = reconcileLayout([{ id: "clock" }]);
    expect(out.map((e) => e.id)).toEqual(["clock"]);
  });

  it("preserves a size override within bounds and clamps an oversized one", () => {
    expect(reconcileLayout([{ id: "system", w: 6, h: 3 }])[0]).toMatchObject({ w: 6, h: 3 });
    expect(reconcileLayout([{ id: "system", w: 99, h: 99 }])[0]).toMatchObject({ w: 8, h: 4 });
  });
});
