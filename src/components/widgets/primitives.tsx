import { useId, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetColor } from "@/lib/widget-colors";

/**
 * The visual shell every widget sits inside: a translucent "glass" panel with
 * a blurred backdrop, a soft top/left light edge, and a subtle lift on hover —
 * the dark, neon-accented look the launcher home screen shares. Widgets supply
 * their own body; this only provides the chrome.
 */
export function Tile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative size-full overflow-hidden rounded-md p-3.5",
        "bg-linear-to-br from-background to-primary/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A soft neon halo behind a value, in the widget's accent color. */
export function glow(color: WidgetColor): CSSProperties {
  return { color: color.stroke, textShadow: `0 0 18px ${color.fill}` };
}

/**
 * Standard widget header: an uppercase, letter-spaced label tinted with the
 * widget's accent color on the left, and either a custom node or a muted icon
 * on the right.
 */
export function TileHeader({
  label,
  color,
  icon: Icon,
  right,
}: {
  label: string;
  color: WidgetColor;
  icon?: LucideIcon;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className="text-[10px] font-semibold uppercase tracking-widest truncate"
        style={{ color: color.stroke }}
      >
        {label}
      </span>
      {right ?? (Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null)}
    </div>
  );
}

/** Hero number for a widget: large, bold, glowing in the accent color. */
export function Value({ color, children }: { color: WidgetColor; children: ReactNode }) {
  return (
    <div className="text-4xl font-bold tabular-nums leading-none" style={glow(color)}>
      {children}
    </div>
  );
}

/** Small muted line beneath a value. */
export function Caption({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground truncate">{children}</div>;
}

/**
 * A 1×1 tile that is itself a button — for simple toggles (dark mode) or
 * single-click actions. Shows an icon over a small label and lights up in the
 * widget's accent color when `active`. Fills its cell; the parent locks it
 * square. In the settings editor the tile is rendered non-interactive, so this
 * doubles as a live state preview there.
 */
export function ActionTile({
  label,
  icon: Icon,
  color,
  active,
  pending,
  onActivate,
}: {
  label: string;
  icon: LucideIcon;
  color: WidgetColor;
  active?: boolean;
  pending?: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={pending}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative flex size-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-md p-2",
        "bg-linear-to-br from-background to-primary/30",
        "transition-[transform,filter] duration-150 hover:brightness-110 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
      style={
        active
          ? { boxShadow: `inset 0 0 0 1.5px ${color.stroke}, 0 0 18px ${color.fill}` }
          : undefined
      }
    >
      <Icon
        className={cn("size-7 shrink-0", !active && "text-muted-foreground")}
        style={
          active
            ? { color: color.stroke, filter: `drop-shadow(0 0 10px ${color.fill})` }
            : undefined
        }
      />
      <span
        className={cn(
          "max-w-full truncate text-[10px] font-semibold uppercase tracking-widest",
          !active && "text-muted-foreground",
        )}
        style={active ? { color: color.stroke } : undefined}
      >
        {label}
      </span>
    </button>
  );
}

export interface ChartSeries {
  history: number[];
  color: WidgetColor;
}

/**
 * Overlaid filled area chart for one or more 0–100 series sharing a common
 * y-axis. Each series fills with a vertical gradient that fades to transparent
 * beneath a glowing stroke. Fills the parent box.
 */
export function AreaChart({ series, className }: { series: ChartSeries[]; className?: string }) {
  const gid = useId();
  const w = 100;
  const h = 40;
  return (
    <svg
      className={cn("size-full", className)}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        {series.map(({ color }, i) => (
          <linearGradient key={i} id={`${gid}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color.stroke} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color.stroke} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      {series.map(({ history, color }, i) => {
        if (history.length < 2) return null;
        const points = history.map((v, idx) => {
          const x = (idx / (history.length - 1)) * w;
          const y = h - (Math.min(100, Math.max(0, v)) / 100) * h;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        });
        const line = `M ${points.join(" L ")}`;
        const area = `M 0,${h} L ${points.join(" L ")} L ${w},${h} Z`;
        return (
          <g key={i}>
            <path d={area} fill={`url(#${gid}-${i})`} />
            <path
              d={line}
              fill="none"
              stroke={color.stroke}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              style={{ filter: `drop-shadow(0 0 5px ${color.stroke})` }}
            />
          </g>
        );
      })}
    </svg>
  );
}
