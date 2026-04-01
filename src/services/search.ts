import { invoke } from "@tauri-apps/api/core";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: "app" | "window" | "file";
}

export type SearchMode = "all" | "apps" | "files" | "media";

export async function searchItems(
  query: string,
  mode: SearchMode = "all",
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("search", { query, mode });
}

export async function activateItem(id: string): Promise<void> {
  return invoke("activate_item", { id });
}

export async function hideWindow(): Promise<void> {
  return invoke("hide_window");
}
