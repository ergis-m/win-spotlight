import { invoke } from "@tauri-apps/api/core";

export type Theme = "system" | "light" | "dark";

const MEDIA_QUERY = window.matchMedia("(prefers-color-scheme: dark)");

function applyClass(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light", !isDark);
}

let currentTheme: Theme = "system";
let mediaListener: (() => void) | null = null;

export function applyTheme(theme: Theme) {
  currentTheme = theme;

  // Clean up previous system listener
  if (mediaListener) {
    MEDIA_QUERY.removeEventListener("change", mediaListener);
    mediaListener = null;
  }

  if (theme === "system") {
    applyClass(MEDIA_QUERY.matches);
    mediaListener = () => applyClass(MEDIA_QUERY.matches);
    MEDIA_QUERY.addEventListener("change", mediaListener);
  } else {
    applyClass(theme === "dark");
  }
}

export function getAppliedTheme(): Theme {
  return currentTheme;
}

export async function loadAndApplyTheme() {
  const settings = await invoke<{ theme: string }>("get_settings");
  applyTheme(settings.theme as Theme);
}
