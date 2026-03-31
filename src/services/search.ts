import { invoke } from "@tauri-apps/api/core";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: "app" | "window";
}

export async function searchItems(query: string): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("search", { query });
}

export async function activateItem(id: string): Promise<void> {
  return invoke("activate_item", { id });
}

export async function hideWindow(): Promise<void> {
  return invoke("hide_window");
}
