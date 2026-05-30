import { Activity, HardDrive, Clock, CloudSun, MoonStar } from "lucide-react";
import { SystemWidget } from "@/components/widgets/SystemWidget";
import { DrivesWidget } from "@/components/widgets/DrivesWidget";
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { DarkModeWidget } from "@/components/widgets/DarkModeWidget";
import { clampSize, entrySize, type WidgetDefinition, type WidgetLayoutEntry } from "./types";

/**
 * Source-of-truth for every widget the app knows about. Settings stores user
 * order / size / config; everything else (display name, icon, render, grid
 * footprint, config schema) lives here so adding a widget is a single registry
 * entry plus a component file.
 */
export const WIDGETS: WidgetDefinition[] = [
  {
    id: "system",
    name: "System",
    description: "CPU, memory, and uptime at a glance.",
    icon: Activity,
    Component: SystemWidget,
    gridSize: { w: 4, h: 2 },
    minSize: { w: 4, h: 2 },
    maxSize: { w: 8, h: 4 },
    defaultEnabled: true,
  },
  {
    id: "drives",
    name: "Drives",
    description: "Free space across each mounted disk.",
    icon: HardDrive,
    Component: DrivesWidget,
    gridSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 },
    defaultEnabled: true,
  },
  {
    id: "clock",
    name: "Clock",
    description: "Current time and date.",
    icon: Clock,
    Component: ClockWidget,
    gridSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 2 },
    defaultEnabled: false,
    defaultConfig: { hour12: false, showSeconds: false },
    configSchema: [
      { key: "hour12", label: "12-hour clock", type: "toggle" },
      { key: "showSeconds", label: "Show seconds", type: "toggle" },
    ],
  },
  {
    id: "weather",
    name: "Weather",
    description: "Local conditions with an hourly forecast.",
    icon: CloudSun,
    Component: WeatherWidget,
    gridSize: { w: 4, h: 2 },
    minSize: { w: 4, h: 2 },
    maxSize: { w: 8, h: 2 },
    defaultEnabled: false,
    defaultConfig: { unit: "auto" },
    configSchema: [
      {
        key: "unit",
        label: "Temperature unit",
        type: "select",
        options: [
          { value: "auto", label: "Automatic" },
          { value: "celsius", label: "Celsius (°C)" },
          { value: "fahrenheit", label: "Fahrenheit (°F)" },
        ],
      },
    ],
  },
  {
    id: "dark-mode",
    name: "Dark Mode",
    description: "Toggle Windows between light and dark theme.",
    icon: MoonStar,
    Component: DarkModeWidget,
    gridSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 1, h: 1 },
    defaultEnabled: false,
  },
];

const WIDGET_INDEX = new Map(WIDGETS.map((w) => [w.id, w]));

export function getWidget(id: string): WidgetDefinition | undefined {
  return WIDGET_INDEX.get(id);
}

/** The board new users (or a reset) start with: every default-enabled widget. */
export function defaultLayout(): WidgetLayoutEntry[] {
  return WIDGETS.filter((w) => w.defaultEnabled).map((w) => ({ id: w.id }));
}

/**
 * Normalize a persisted layout against the registry: drop unknown / duplicate
 * ids and legacy-disabled entries, clamp each entry's size, and seed the
 * default board when the layout is empty (first run or full reset). Newly
 * shipped widgets are NOT auto-added — they surface in the "Add" menu so the
 * user's curated board is left alone.
 */
export function reconcileLayout(persisted: WidgetLayoutEntry[]): WidgetLayoutEntry[] {
  const seen = new Set<string>();
  const out: WidgetLayoutEntry[] = [];
  for (const entry of persisted) {
    const def = WIDGET_INDEX.get(entry.id);
    if (!def || seen.has(entry.id)) continue;
    if (entry.enabled === false) continue; // legacy: user toggled it off
    seen.add(entry.id);
    const { w, h } = entrySize(def, entry);
    out.push({ id: entry.id, w, h, ...(entry.config ? { config: entry.config } : {}) });
  }
  if (out.length === 0) {
    return defaultLayout().map((entry) => {
      const def = WIDGET_INDEX.get(entry.id)!;
      const { w, h } = clampSize(resolveBase(def), def);
      return { id: entry.id, w, h };
    });
  }
  return out;
}

function resolveBase(def: WidgetDefinition) {
  return def.gridSize ?? { w: 2, h: 2 };
}
