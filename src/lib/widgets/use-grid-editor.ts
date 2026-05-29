import { useRef, useState, type PointerEvent as ReactPointerEvent, type DragEvent } from "react";
import { getWidget } from "./registry";
import {
  clampSize,
  entrySize,
  GRID_COLUMNS,
  type WidgetDefinition,
  type WidgetLayoutEntry,
} from "./types";

// Matches the grid container classes (`gap-2 p-2`) so px→cell math lines up.
const GAP = 8;
const PAD = 8;

// A 1×1 transparent GIF used to suppress the browser's default drag ghost, so
// the tile itself is what the user sees snapping between grid cells.
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const dragGhost = typeof Image !== "undefined" ? new Image() : undefined;
if (dragGhost) dragGhost.src = TRANSPARENT_PIXEL;

interface EditorArgs {
  /** The current working layout (source of truth lives in the page). */
  layout: WidgetLayoutEntry[];
  /** Update the working layout locally during a gesture (no persistence). */
  onChange: (next: WidgetLayoutEntry[]) => void;
  /** Persist the layout once a gesture ends. */
  onCommit: (next: WidgetLayoutEntry[]) => void;
}

interface ResizeState {
  id: string;
  def: WidgetDefinition;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  pitchX: number;
  pitchY: number;
}

function widgetIdFrom(target: EventTarget | null, selector = "[data-widget-id]"): string | null {
  const el = (target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
  return el?.dataset.widgetId ?? null;
}

/**
 * Pointer/drag interactions for the widget board, attached once to the grid
 * container via event delegation: HTML5 drag-and-drop reorders, the Pointer
 * Capture API resizes from a corner handle. The target widget is read from
 * `data-widget-id` on each tile. Deliberately avoids `useEffect` / window
 * listeners (project rule) — everything hangs off the container's handlers.
 */
export function useGridEditor({ layout, onChange, onCommit }: EditorArgs) {
  const dragId = useRef<string | null>(null);
  const resize = useRef<ResizeState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);

  function move(from: string, to: string): WidgetLayoutEntry[] {
    const i = layout.findIndex((e) => e.id === from);
    const j = layout.findIndex((e) => e.id === to);
    if (i < 0 || j < 0 || i === j) return layout;
    const next = [...layout];
    const [moved] = next.splice(i, 1);
    next.splice(j, 0, moved);
    return next;
  }

  const gridProps = {
    // ----- reorder (HTML5 drag-and-drop) -----
    onDragStart: (e: DragEvent) => {
      // Starting on a control (gear / remove / resize) must not begin a drag.
      if ((e.target as HTMLElement).closest("[data-no-drag]")) {
        e.preventDefault();
        return;
      }
      const id = widgetIdFrom(e.target);
      if (!id) return;
      dragId.current = id;
      setDraggingId(id);
      e.dataTransfer.effectAllowed = "move";
      if (dragGhost) e.dataTransfer.setDragImage(dragGhost, 0, 0);
    },
    onDragEnter: (e: DragEvent) => {
      const over = widgetIdFrom(e.target);
      if (over && dragId.current && over !== dragId.current) {
        onChange(move(dragId.current, over));
      }
    },
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDragEnd: () => {
      dragId.current = null;
      setDraggingId(null);
      onCommit(layout);
    },

    // ----- resize (pointer capture from the corner handle) -----
    onPointerDown: (e: ReactPointerEvent) => {
      const handle = (e.target as HTMLElement).closest("[data-resize]");
      const id = handle ? widgetIdFrom(handle) : null;
      const def = id ? getWidget(id) : undefined;
      const entry = id ? layout.find((en) => en.id === id) : undefined;
      if (!id || !def || !entry) return;
      e.preventDefault();
      const width = e.currentTarget.getBoundingClientRect().width;
      const cell = (width - PAD * 2 - GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
      const { w, h } = entrySize(def, entry);
      resize.current = {
        id,
        def,
        startX: e.clientX,
        startY: e.clientY,
        startW: w,
        startH: h,
        pitchX: cell + GAP,
        pitchY: cell + GAP,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      setResizingId(id);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const r = resize.current;
      if (!r) return;
      const dCols = Math.round((e.clientX - r.startX) / r.pitchX);
      const dRows = Math.round((e.clientY - r.startY) / r.pitchY);
      const size = clampSize({ w: r.startW + dCols, h: r.startH + dRows }, r.def);
      onChange(layout.map((en) => (en.id === r.id ? { ...en, w: size.w, h: size.h } : en)));
    },
    onPointerUp: (e: ReactPointerEvent) => {
      if (!resize.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      resize.current = null;
      setResizingId(null);
      onCommit(layout);
    },
  };

  return { gridProps, draggingId, resizingId };
}
