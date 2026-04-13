import { invoke } from "@tauri-apps/api/core";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: "app" | "window" | "file" | "url" | "command" | "tab";
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

export async function getFileThumbnail(path: string): Promise<string | null> {
  return invoke<string | null>("get_file_thumbnail", { path });
}
