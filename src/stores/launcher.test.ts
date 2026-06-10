import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TABS,
  launcher$,
  setQuery,
  setTab,
  cycleTab,
  setSelectedValue,
  resetLauncher,
} from "./launcher";

beforeEach(() => {
  resetLauncher();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("launcher$ — initial state", () => {
  it("starts empty on the 'apps' tab", () => {
    expect(launcher$.peek()).toEqual({
      rawQuery: "",
      query: "",
      tab: "apps",
      selectedValue: "",
    });
  });
});

describe("setQuery", () => {
  it("updates the input immediately and clears selectedValue so cmdk highlights the first result", () => {
    setSelectedValue("some-id");
    setQuery("foo");
    expect(launcher$.rawQuery.peek()).toBe("foo");
    expect(launcher$.selectedValue.peek()).toBe("");
  });

  it("debounces the search query by 100ms", () => {
    vi.useFakeTimers();
    setQuery("foo");
    expect(launcher$.query.peek()).toBe("");
    vi.advanceTimersByTime(100);
    expect(launcher$.query.peek()).toBe("foo");
  });
});

describe("setTab", () => {
  it("switches to the given tab", () => {
    setTab("files");
    expect(launcher$.tab.peek()).toBe("files");
  });
});

describe("cycleTab", () => {
  it("advances forward through every tab then wraps to the start", () => {
    const order = TABS.map((t) => t.key);
    // Start on 'apps' (index 0) → expect sequence of remaining tabs then wrap back.
    for (let i = 1; i < order.length; i++) {
      cycleTab(false);
      expect(launcher$.tab.peek()).toBe(order[i]);
    }
    cycleTab(false);
    expect(launcher$.tab.peek()).toBe(order[0]);
  });

  it("wraps backward past the first tab to the last", () => {
    cycleTab(true);
    expect(launcher$.tab.peek()).toBe(TABS[TABS.length - 1].key);
  });

  it("forward then reverse returns to the starting tab", () => {
    const start = launcher$.tab.peek();
    cycleTab(false);
    cycleTab(true);
    expect(launcher$.tab.peek()).toBe(start);
  });
});

describe("resetLauncher", () => {
  it("restores the initial state regardless of prior mutations", () => {
    setQuery("abc");
    setTab("files");
    setSelectedValue("xyz");
    resetLauncher();
    expect(launcher$.peek()).toEqual({
      rawQuery: "",
      query: "",
      tab: "apps",
      selectedValue: "",
    });
  });
});
