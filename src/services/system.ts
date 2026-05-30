import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";

export interface DriveInfo {
  name: string;
  mount_point: string;
  total_bytes: number;
  available_bytes: number;
}

export interface SystemInfo {
  cpu_usage: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  drives: DriveInfo[];
  /** Seconds since the OS booted. */
  uptime_seconds: number;
}

const HISTORY_SIZE = 60;
const histories = new Map<string, number[]>();

function pushHistory(key: string, value: number) {
  const arr = histories.get(key) ?? [];
  arr.push(value);
  if (arr.length > HISTORY_SIZE) arr.shift();
  histories.set(key, arr);
}

export function getHistory(key: string): number[] {
  return histories.get(key) ?? [];
}

export function driveHistoryKey(mount: string): string {
  return `drive:${mount}`;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const info = await invoke<SystemInfo>("get_system_info");
  pushHistory("cpu", info.cpu_usage);
  const memPct = info.memory_total_bytes
    ? (info.memory_used_bytes / info.memory_total_bytes) * 100
    : 0;
  pushHistory("memory", memPct);
  for (const d of info.drives) {
    const used = d.total_bytes - d.available_bytes;
    const pct = d.total_bytes ? (used / d.total_bytes) * 100 : 0;
    pushHistory(driveHistoryKey(d.mount_point), pct);
  }
  return info;
}

export function useSystemInfo() {
  return useQuery({
    queryKey: ["system-info"],
    queryFn: getSystemInfo,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
}

// ── System dark mode (1×1 widget toggle) ──

/** Whether Windows is currently in dark mode (system + apps preference). */
export function getSystemDarkMode(): Promise<boolean> {
  return invoke<boolean>("get_system_dark_mode");
}

export function setSystemDarkMode(dark: boolean): Promise<void> {
  return invoke("set_system_dark_mode", { dark });
}

export function useSystemDarkMode() {
  return useQuery({
    queryKey: ["system-dark-mode"],
    queryFn: getSystemDarkMode,
    // Picks up changes made elsewhere (Settings app) without hammering the registry.
    refetchInterval: 4000,
  });
}
