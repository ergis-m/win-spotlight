import type { WidgetConfig, WidgetDefinition, WidgetLayoutEntry } from "./types";

/**
 * The config a widget renders with: the registry defaults overlaid with the
 * user's saved values, filtered to the keys the widget actually declares so a
 * stale saved key can't leak through.
 */
export function resolveConfig(def: WidgetDefinition, entry: WidgetLayoutEntry): WidgetConfig {
  const defaults = def.defaultConfig ?? {};
  const saved = entry.config ?? {};
  const out: WidgetConfig = { ...defaults };
  for (const field of def.configSchema ?? []) {
    if (field.key in saved) out[field.key] = saved[field.key];
  }
  return out;
}
