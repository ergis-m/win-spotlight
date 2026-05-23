import { Cpu, MemoryStick, HardDrive, type LucideIcon } from "lucide-react";
import { useSystemInfo, getHistory, driveHistoryKey, type DriveInfo } from "@/services/system";
import { colorForId, type WidgetColor } from "@/lib/widget-colors";

const GIB = 1024 ** 3;
const fmt = (b: number) => `${(b / GIB).toFixed(1)} GB`;

function Sparkline({ history, color }: { history: number[]; color: WidgetColor }) {
  if (history.length < 2) return null;
  const w = 100;
  const h = 30;
  const points = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - (Math.min(100, Math.max(0, v)) / 100) * h;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M ${points.join(" L ")}`;
  const area = `M 0,${h} L ${points.join(" L ")} L ${w},${h} Z`;
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} fill={color.fill} />
      <path
        d={line}
        fill="none"
        stroke={color.stroke}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface MetricCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  percent: number;
  history: number[];
}

function MetricCard({ id, icon: Icon, title, detail, percent, history }: MetricCardProps) {
  const color = colorForId(id);
  return (
    <div className="relative flex-1 overflow-hidden rounded-md bg-background/50 p-2">
      <Sparkline history={history} color={color} />
      <div className="relative flex items-center gap-2">
        <Icon className="size-5 shrink-0" style={{ color: color.stroke }} />
        <div className="text-xs font-medium">{title}</div>
        <div
          className="ml-auto text-base font-semibold tabular-nums leading-none"
          style={{ color: color.stroke }}
        >
          {percent.toFixed(0)}%
        </div>
      </div>
      <div className="relative mt-1 text-[10px] text-muted-foreground truncate">{detail}</div>
    </div>
  );
}

function DriveRow({ drive }: { drive: DriveInfo }) {
  const used = drive.total_bytes - drive.available_bytes;
  const pct = drive.total_bytes ? (used / drive.total_bytes) * 100 : 0;
  const mount = drive.mount_point.replace(/\\$/, "");
  const color = colorForId(driveHistoryKey(drive.mount_point));
  return (
    <div className="relative h-5 rounded overflow-hidden bg-foreground/5">
      <div
        className="absolute inset-y-0 left-0"
        style={{ background: color.fill, width: `${pct}%` }}
      />
      <div className="relative flex h-full items-center gap-2 px-1.5 text-[10px]">
        <span className="font-semibold tabular-nums" style={{ color: color.stroke }}>
          {mount}
        </span>
        <span className="text-muted-foreground truncate">
          {fmt(used)} / {fmt(drive.total_bytes)}
        </span>
        <span className="ml-auto font-semibold tabular-nums" style={{ color: color.stroke }}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function DrivesCard({ drives }: { drives: DriveInfo[] }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-md bg-background/50 p-2">
      <div className="flex items-center gap-2">
        <HardDrive className="size-5 shrink-0 text-muted-foreground" />
        <div className="text-xs font-medium">Drives</div>
        <div className="ml-auto text-[10px] text-muted-foreground">{drives.length}</div>
      </div>
      <div className="flex flex-col gap-1">
        {drives.map((d) => (
          <DriveRow key={d.mount_point} drive={d} />
        ))}
      </div>
    </div>
  );
}

export function BigWidgets() {
  const { data } = useSystemInfo();

  if (!data) return null;

  const cores = navigator.hardwareConcurrency ?? 0;
  const memPct = data.memory_total_bytes
    ? (data.memory_used_bytes / data.memory_total_bytes) * 100
    : 0;

  return (
    <div className="flex items-stretch gap-2 p-2">
      <MetricCard
        id="cpu"
        icon={Cpu}
        title="CPU"
        detail={cores ? `${cores} cores` : "Processor"}
        percent={data.cpu_usage}
        history={getHistory("cpu")}
      />
      <MetricCard
        id="memory"
        icon={MemoryStick}
        title="Memory"
        detail={`${fmt(data.memory_used_bytes)} / ${fmt(data.memory_total_bytes)}`}
        percent={memPct}
        history={getHistory("memory")}
      />
      <DrivesCard drives={data.drives} />
    </div>
  );
}
