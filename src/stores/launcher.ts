import { create } from "zustand";
import type { SearchMode } from "@/services/search";

export const TABS: { key: SearchMode; label: string; placeholder: string }[] = [
  { key: "all", label: "All", placeholder: "Search apps, files..." },
  { key: "apps", label: "Apps", placeholder: "Search apps..." },
  { key: "files", label: "Files", placeholder: "Search files..." },
  { key: "media", label: "Media", placeholder: "Search media..." },
];

interface LauncherState {
  query: string;
  tab: SearchMode;
  selectedValue: string;
}

export const useLauncherStore = create<LauncherState>(() => ({
  query: "",
  tab: "all",
  selectedValue: "",
}));

export const setQuery = (query: string) => useLauncherStore.setState({ query, selectedValue: "" });

export const setTab = (tab: SearchMode) => useLauncherStore.setState({ tab });

export const cycleTab = (reverse: boolean) =>
  useLauncherStore.setState((state) => {
    const idx = TABS.findIndex((t) => t.key === state.tab);
    const next = reverse ? (idx - 1 + TABS.length) % TABS.length : (idx + 1) % TABS.length;
    return { tab: TABS[next].key };
  });

export const setSelectedValue = (selectedValue: string) =>
  useLauncherStore.setState({ selectedValue });

export const resetLauncher = () =>
  useLauncherStore.setState({ query: "", tab: "all", selectedValue: "" });
