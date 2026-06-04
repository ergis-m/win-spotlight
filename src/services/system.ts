import { observable } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { use$ } from "@legendapp/state/react";
import { invoke } from "@tauri-apps/api/core";
import { poll } from "@/lib/sync-helpers";

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

/** Live system stats; polls once per second (even while the launcher is hidden). */
const systemInfo$ = observable(
  synced<SystemInfo>({
    get: getSystemInfo,
    subscribe: ({ refresh }) => poll(refresh, 1000),
  }),
);

export function useSystemInfo(): SystemInfo | undefined {
  return use$(systemInfo$);
}

// ── System dark mode (1×1 widget toggle) ──

function getSystemDarkMode(): Promise<boolean> {
  return invoke<boolean>("get_system_dark_mode");
}

function setSystemDarkMode(dark: boolean): Promise<void> {
  return invoke("set_system_dark_mode", { dark });
}

/**
 * Live Windows dark-mode flag. Polls every 4s to pick up changes made elsewhere
 * (e.g. the Settings app) without hammering the registry, and writes back to the
 * OS when set.
 */
export const systemDarkMode$ = observable(
  synced<boolean>({
    get: getSystemDarkMode,
    set: ({ value }) => setSystemDarkMode(value),
    subscribe: ({ refresh }) => poll(refresh, 4000),
    initial: false,
  }),
);
