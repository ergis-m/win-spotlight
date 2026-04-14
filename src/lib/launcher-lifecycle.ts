import { getCurrentWindow } from "@tauri-apps/api/window";
import { resetLauncher } from "@/stores/launcher";
import { loadAndApplySettings } from "@/lib/theme";

let inputElement: HTMLInputElement | null = null;
let listElement: HTMLDivElement | null = null;

export const setInputElement = (el: HTMLInputElement | null) => {
  inputElement = el;
};

export const setListElement = (el: HTMLDivElement | null) => {
  listElement = el;
};

export const focusInput = () => {
  inputElement?.focus();
};

export const scrollListToTop = () => {
  listElement?.scrollTo(0, 0);
};

getCurrentWindow().onFocusChanged(({ payload: focused }) => {
  if (!focused) return;
  resetLauncher();
  loadAndApplySettings();
  focusInput();
});
