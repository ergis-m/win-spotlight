import { observable } from "@legendapp/state";
import type { SearchMode } from "@/services/search";

export const TABS: { key: SearchMode; label: string; placeholder: string }[] = [
  { key: "apps", label: "Apps", placeholder: "Search apps, calculate, convert..." },
  { key: "files", label: "Files", placeholder: "Search files..." },
];

interface LauncherState {
  rawQuery: string;
  query: string;
  tab: SearchMode;
  selectedValue: string;
}

export const launcher$ = observable<LauncherState>({
  rawQuery: "",
  query: "",
  tab: "apps",
  selectedValue: "",
});

export const setQuery = (query: string) => {
  launcher$.rawQuery.set(query);
  launcher$.selectedValue.set("");
  launcher$.query.set(query);
};

export const setTab = (tab: SearchMode) => launcher$.tab.set(tab);

export const cycleTab = (reverse: boolean) => {
  const idx = TABS.findIndex((t) => t.key === launcher$.tab.peek());
  const next = reverse ? (idx - 1 + TABS.length) % TABS.length : (idx + 1) % TABS.length;
  launcher$.tab.set(TABS[next].key);
};

export const setSelectedValue = (selectedValue: string) =>
  launcher$.selectedValue.set(selectedValue);

export const resetLauncher = () => {
  launcher$.assign({ rawQuery: "", query: "", tab: "apps", selectedValue: "" });
};
