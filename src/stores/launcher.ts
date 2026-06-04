import { observable } from "@legendapp/state";
import type { SearchMode } from "@/services/search";

export const TABS: { key: SearchMode; label: string; placeholder: string }[] = [
  { key: "all", label: "All", placeholder: "Search apps, files..." },
  { key: "apps", label: "Apps", placeholder: "Search apps..." },
  { key: "files", label: "Files", placeholder: "Search files..." },
  { key: "media", label: "Media", placeholder: "Search media..." },
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
  tab: "all",
  selectedValue: "",
});

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export const setQuery = (query: string) => {
  launcher$.rawQuery.set(query);
  launcher$.selectedValue.set("");
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => launcher$.query.set(query), 20);
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
  clearTimeout(debounceTimer);
  launcher$.assign({ rawQuery: "", query: "", tab: "all", selectedValue: "" });
};
