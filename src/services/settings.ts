import { observable, syncState } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { invoke } from "@tauri-apps/api/core";
import { onFocus, poll } from "@/lib/sync-helpers";
import { applyTheme, type Theme } from "@/lib/theme";
import type { WidgetsConfig } from "@/lib/widgets/types";

export type { WidgetLayoutEntry, WidgetsConfig } from "@/lib/widgets/types";

export interface AppSettings {
  autostart: boolean;
  theme: string;
  launcher_size: string;
  widgets: WidgetsConfig;
  show_browser_tabs: boolean;
}

export function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export function setTheme(theme: string): Promise<void> {
  return invoke("set_theme", { theme });
}

export function setAutostart(enabled: boolean): Promise<void> {
  return invoke("set_autostart", { enabled });
}

export function setShowBrowserTabs(enabled: boolean): Promise<void> {
  return invoke("set_show_browser_tabs", { enabled });
}

export function setLauncherSize(size: string): Promise<void> {
  return invoke("set_launcher_size", { size });
}

export function setWidgetsConfig(widgets: WidgetsConfig): Promise<void> {
  return invoke("set_widgets_config", { widgets });
}

/** App settings, shared across every screen. Refetches when the window regains focus. */
export const settings$ = observable(
  synced<AppSettings>({
    get: getSettings,
    subscribe: ({ refresh }) => onFocus(refresh),
  }),
);

// Each setter updates the observable optimistically (so every screen reflects the
// change instantly) then writes to the backend, re-pulling truth if the write fails.
async function commit(write: () => Promise<void>) {
  try {
    await write();
  } catch {
    void syncState(settings$).sync();
  }
}

export async function updateTheme(theme: string) {
  applyTheme(theme as Theme);
  settings$.theme.set(theme);
  await commit(() => setTheme(theme));
}

export async function updateLauncherSize(size: string) {
  settings$.launcher_size.set(size);
  await commit(() => setLauncherSize(size));
}

export async function updateShowBrowserTabs(enabled: boolean) {
  settings$.show_browser_tabs.set(enabled);
  await commit(() => setShowBrowserTabs(enabled));
}

export async function updateWidgets(widgets: WidgetsConfig) {
  settings$.widgets.set(widgets);
  await commit(() => setWidgetsConfig(widgets));
}

export async function updateAutostart(enabled: boolean) {
  settings$.autostart.set(enabled);
  try {
    await setAutostart(enabled);
  } catch (err) {
    console.error("[autostart] failed:", err);
    void syncState(settings$).sync();
  }
}

// ── File search settings ──

export interface FileSearchSettings {
  enabled: boolean;
  directories: string[];
  excluded_dirs: string[];
  max_depth: number;
}

export interface FileIndexStatus {
  ready: boolean;
  file_count: number;
  last_indexed: number;
}

export function getFileSearchSettings(): Promise<FileSearchSettings> {
  return invoke<FileSearchSettings>("get_file_search_settings");
}

export function setFileSearchSettings(settings: FileSearchSettings): Promise<void> {
  return invoke("set_file_search_settings", { settings });
}

export function rebuildFileIndex(): Promise<void> {
  return invoke("rebuild_file_index");
}

export function getFileIndexStatus(): Promise<FileIndexStatus> {
  return invoke<FileIndexStatus>("get_file_index_status");
}

export const fileSearchSettings$ = observable(
  synced<FileSearchSettings>({
    get: getFileSearchSettings,
    subscribe: ({ refresh }) => onFocus(refresh),
  }),
);

/** Index progress; polls every 3s while indexing runs. */
export const fileIndexStatus$ = observable(
  synced<FileIndexStatus>({
    get: getFileIndexStatus,
    subscribe: ({ refresh }) => poll(refresh, 3000),
  }),
);

export async function updateFileSearchSettings(updated: FileSearchSettings) {
  fileSearchSettings$.set(updated);
  try {
    await setFileSearchSettings(updated);
  } catch {
    void syncState(fileSearchSettings$).sync();
  } finally {
    void syncState(fileIndexStatus$).sync();
  }
}

export async function rebuildIndex() {
  await rebuildFileIndex();
  void syncState(fileIndexStatus$).sync();
}
