import { invoke } from "@tauri-apps/api/core";

export interface AppSettings {
  autostart: boolean;
  theme: string;
  launcher_size: string;
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

export function setLauncherSize(size: string): Promise<void> {
  return invoke("set_launcher_size", { size });
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
