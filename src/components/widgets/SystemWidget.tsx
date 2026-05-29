import { Activity, Clock } from "lucide-react";
import { useSystemInfo, getHistory } from "@/services/system";
import { colorForId, type WidgetColor } from "@/lib/widget-colors";
import { Tile, AreaChart, glow } from "./primitives";

const GIB = 1024 ** 3;
const gb = (b: number) => (b / GIB).toFixed(1);

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Colour dot + caps label + live value, identifying one chart series. */
function Legend({ label, value, color }: { label: string; value: string; color: WidgetColor }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: color.stroke, boxShadow: `0 0 6px ${color.stroke}` }}
      />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums" style={glow(color)}>
        {value}
      </span>
    </div>
  );
}

/**
 * A single 4×2 panel rolling CPU, memory, and uptime into one readout: both
 * CPU and RAM utilisation plotted as overlaid area series on a shared 0–100%
 * chart, with a live legend above and a metadata footer below.
 */
export function SystemWidget() {
  const { data } = useSystemInfo();
  if (!data) return null;

  const cpuColor = colorForId("cpu");
  const memColor = colorForId("memory");

  const memPct = data.memory_total_bytes
    ? (data.memory_used_bytes / data.memory_total_bytes) * 100
    : 0;
  const cores = navigator.hardwareConcurrency ?? 0;

  return (
    <Tile>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Legend label="CPU" value={`${data.cpu_usage.toFixed(0)}%`} color={cpuColor} />
            <Legend label="RAM" value={`${memPct.toFixed(0)}%`} color={memColor} />
          </div>
          <Activity className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="mt-2 min-h-0 flex-1">
          <AreaChart
            series={[
              { history: getHistory("cpu"), color: cpuColor },
              { history: getHistory("memory"), color: memColor },
            ]}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {formatUptime(data.uptime_seconds)} up
          </span>
          <span className="truncate tabular-nums">
            {gb(data.memory_used_bytes)}/{gb(data.memory_total_bytes)} GB
            {cores ? ` · ${cores} cores` : ""}
          </span>
        </div>
      </div>
    </Tile>
  );
}
