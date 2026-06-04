import { observable, type Observable } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { invoke } from "@tauri-apps/api/core";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: "app" | "window" | "file" | "url" | "command" | "tab" | "game";
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

const thumbnails = new Map<string, Observable<string | null>>();

/**
 * Cached thumbnail observable for a file path, fetched once and kept for the
 * session — a file's thumbnail doesn't change while the launcher is open.
 */
export function fileThumbnail$(path: string): Observable<string | null> {
  let thumb$ = thumbnails.get(path);
  if (!thumb$) {
    thumb$ = observable(
      synced<string | null>({
        get: () => getFileThumbnail(path),
        initial: null,
      }),
    );
    thumbnails.set(path, thumb$);
  }
  return thumb$;
}
