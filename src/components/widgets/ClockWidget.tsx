import { useMemo } from "react";
import { Clock } from "lucide-react";
import { useTick } from "@/lib/use-tick";
import { colorForId } from "@/lib/widget-colors";
import type { WidgetConfig } from "@/lib/widgets/types";
import Tile from "./Tile";
import { TileHeader, Value, Caption } from "./primitives";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTime(d: Date, hour12: boolean, showSeconds: boolean): string {
  let hours = d.getHours();
  let suffix = "";
  if (hour12) {
    suffix = hours < 12 ? " AM" : " PM";
    hours = hours % 12 === 0 ? 12 : hours % 12;
  }
  const base = `${hour12 ? hours : pad(hours)}:${pad(d.getMinutes())}`;
  const withSeconds = showSeconds ? `${base}:${pad(d.getSeconds())}` : base;
  return `${withSeconds}${suffix}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ClockWidget({ config }: { config: WidgetConfig }) {
  const hour12 = config.hour12 === true;
  const showSeconds = config.showSeconds === true;
  // Tick every second when seconds are shown, otherwise once a minute.
  const now = useTick(showSeconds ? 1000 : 1000 * 30);
  const date = useMemo(() => new Date(now), [now]);
  const color = colorForId("clock");
  return (
    <Tile>
      <div className="flex h-full flex-col">
        <TileHeader label="Clock" color={color} icon={Clock} />
        <div className="mt-auto flex flex-col gap-1 mb-2">
          <Caption>{formatDate(date)}</Caption>
          <Value color={color}>{formatTime(date, hour12, showSeconds)}</Value>
        </div>
      </div>
    </Tile>
  );
}
