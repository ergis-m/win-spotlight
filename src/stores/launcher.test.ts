import { beforeEach, describe, expect, it } from "vitest";
import {
  TABS,
  useLauncherStore,
  setQuery,
  setTab,
  cycleTab,
  setSelectedValue,
  resetLauncher,
} from "./launcher";

beforeEach(() => {
  resetLauncher();
});

describe("useLauncherStore — initial state", () => {
  it("starts empty on the 'all' tab", () => {
    expect(useLauncherStore.getState()).toEqual({
      query: "",
      tab: "all",
      selectedValue: "",
    });
  });
});

describe("setQuery", () => {
  it("updates query and clears selectedValue so cmdk highlights the first result", () => {
    setSelectedValue("some-id");
    setQuery("foo");
    const state = useLauncherStore.getState();
    expect(state.query).toBe("foo");
    expect(state.selectedValue).toBe("");
  });
});

describe("setTab", () => {
  it("switches to the given tab", () => {
    setTab("files");
    expect(useLauncherStore.getState().tab).toBe("files");
  });
});

describe("cycleTab", () => {
  it("advances forward through every tab then wraps to the start", () => {
    const order = TABS.map((t) => t.key);
    // Start on 'all' (index 0) → expect sequence of remaining tabs then wrap back.
    for (let i = 1; i < order.length; i++) {
      cycleTab(false);
      expect(useLauncherStore.getState().tab).toBe(order[i]);
    }
    cycleTab(false);
    expect(useLauncherStore.getState().tab).toBe(order[0]);
  });

  it("wraps backward past the first tab to the last", () => {
    cycleTab(true);
    expect(useLauncherStore.getState().tab).toBe(TABS[TABS.length - 1].key);
  });

  it("forward then reverse returns to the starting tab", () => {
    const start = useLauncherStore.getState().tab;
    cycleTab(false);
    cycleTab(true);
    expect(useLauncherStore.getState().tab).toBe(start);
  });
});

describe("resetLauncher", () => {
  it("restores the initial state regardless of prior mutations", () => {
    setQuery("abc");
    setTab("media");
    setSelectedValue("xyz");
    resetLauncher();
    expect(useLauncherStore.getState()).toEqual({
      query: "",
      tab: "all",
      selectedValue: "",
    });
  });
});
