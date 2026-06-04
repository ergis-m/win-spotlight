import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Re-run a synced observable's `get` when the Tauri window regains focus.
 * Replaces TanStack Query's `focusManager` / `refetchOnWindowFocus`. Pass as a
 * synced `subscribe`; the returned cleanup detaches the listener when the
 * observable is no longer observed.
 */
export function onFocus(refresh: () => void): () => void {
  const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    if (focused) refresh();
  });
  return () => {
    void unlisten.then((u) => u());
  };
}

/** Re-run a synced observable's `get` every `ms`. Replaces `refetchInterval`. */
export function poll(refresh: () => void, ms: number): () => void {
  const id = setInterval(refresh, ms);
  return () => clearInterval(id);
}
