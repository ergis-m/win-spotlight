import { focusManager } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";

focusManager.setEventListener((handleFocus) => {
  const unlistenPromise = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    handleFocus(focused);
  });
  return () => {
    unlistenPromise.then((unlisten) => unlisten());
  };
});
