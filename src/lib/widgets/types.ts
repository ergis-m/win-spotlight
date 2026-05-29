import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

/** Columns in the iOS-style widget grid. Fixed so tiles snap cleanly across
 *  all launcher sizes (compact / normal / fancy). */
export const GRID_COLUMNS = 8;

/**
 * Per-widget options, persisted on the layout entry. Values are primitives so
 * they round-trip through JSON / the Rust settings store unchanged.
 */
export type WidgetConfig = Record<string, string | number | boolean>;

/** A single field in a widget's configuration form. */
export interface ConfigField {
  key: string;
  label: string;
  type: "select" | "toggle";
  /** Required for `select`. */
  options?: { value: string; label: string }[];
}

/**
 * Footprint of a widget on the grid. Width / height are in grid cells. Data
 * widgets are 2×2; the combined System / Weather widgets are 4×2.
 */
export interface WidgetGridSize {
  w: number;
  h: number;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  Component: ComponentType<{ config: WidgetConfig }>;
  /** Default cells this widget occupies. Default 2×2 if unspecified. */
  gridSize?: WidgetGridSize;
  /** Resize clamps. Default to `gridSize` (min) and the full grid (max). */
  minSize?: WidgetGridSize;
  maxSize?: WidgetGridSize;
  /** Fields shown in the per-widget config dialog. */
  configSchema?: ConfigField[];
  /** Defaults applied before the user's saved config. */
  defaultConfig?: WidgetConfig;
  /** Whether this widget should be on the default board for new users. */
  defaultEnabled?: boolean;
}

export interface WidgetLayoutEntry {
  id: string;
  /** Legacy / optional. Placed widgets are shown; defaults to true on read. */
  enabled?: boolean;
  /** Grid-cell size override; falls back to the registry default. */
  w?: number;
  h?: number;
  /** Saved per-widget options, merged over the registry defaults at render. */
  config?: WidgetConfig;
}

export interface WidgetsConfig {
  enabled: boolean;
  layout: WidgetLayoutEntry[];
}

export const DEFAULT_GRID_SIZE: WidgetGridSize = { w: 2, h: 2 };

export function resolveGridSize(def: WidgetDefinition): WidgetGridSize {
  return def.gridSize ?? DEFAULT_GRID_SIZE;
}

/** The size an entry occupies: its override if set, else the registry default. */
export function entrySize(def: WidgetDefinition, entry: WidgetLayoutEntry): WidgetGridSize {
  const base = resolveGridSize(def);
  return clampSize({ w: entry.w ?? base.w, h: entry.h ?? base.h }, def);
}

/**
 * Clamp a size to the widget's min/max bounds and the grid width. Min defaults
 * to the widget's base size, max to the full grid width × the base height
 * doubled, so a widget can grow but never exceed the board.
 */
export function clampSize(size: WidgetGridSize, def: WidgetDefinition): WidgetGridSize {
  const base = resolveGridSize(def);
  const min = def.minSize ?? base;
  const max = def.maxSize ?? { w: GRID_COLUMNS, h: base.h * 2 };
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
  return {
    w: clamp(size.w, min.w, Math.min(max.w, GRID_COLUMNS)),
    h: clamp(size.h, min.h, max.h),
  };
}
