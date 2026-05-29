import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getWidget, reconcileLayout } from "@/lib/widgets/registry";
import { resolveConfig } from "@/lib/widgets/config";
import { entrySize, GRID_COLUMNS, type WidgetLayoutEntry } from "@/lib/widgets/types";

export { GRID_COLUMNS };

interface WidgetAreaProps {
  layout: WidgetLayoutEntry[];
  className?: string;
}

/**
 * Renders placed widgets on the fixed 8-column grid. Each tile spans its
 * resolved `w × h` (entry override, else registry default) and locks its
 * aspect ratio so cells stay square — the same model iOS uses for home-screen
 * widgets. `grid-auto-flow: dense` packs mixed sizes without leaving holes.
 *
 * This is the read-only home renderer; the settings editor reuses the same
 * grid math for its interactive board.
 */
export function WidgetArea({ layout, className }: WidgetAreaProps) {
  const resolved = useMemo(() => reconcileLayout(layout), [layout]);

  console.log(layout);

  if (resolved.length === 0) return null;

  return (
    <div
      className={cn("grid grid-flow-dense py-1", className)}
      style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
    >
      {resolved.map((entry) => {
        const def = getWidget(entry.id);
        if (!def) return null;
        const { w, h } = entrySize(def, entry);
        const Component = def.Component;
        return (
          <div
            key={entry.id}
            style={{
              gridColumn: `span ${w} / span ${w}`,
              gridRow: `span ${h} / span ${h}`,
              aspectRatio: `${w} / ${h}`,
            }}
            className="p-1"
          >
            <Component config={resolveConfig(def, entry)} />
          </div>
        );
      })}
    </div>
  );
}
