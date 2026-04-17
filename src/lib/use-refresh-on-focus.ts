import { useCallback, useSyncExternalStore } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useRefreshOnFocus(refetch: () => unknown) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const unlistenPromise = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (focused) {
          refetch();
          notify();
        }
      });
      return () => {
        unlistenPromise.then((unlisten) => unlisten());
      };
    },
    [refetch],
  );

  useSyncExternalStore(
    subscribe,
    () => 0,
    () => 0,
  );
}
