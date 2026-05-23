import { useMemo } from "react";
import { Cpu, MemoryStick, HardDrive } from "lucide-react";
import { useSystemInfo, type DriveInfo } from "@/services/system";

const GIB = 1024 ** 3;

function formatGiB(bytes: number): string {
  return `${(bytes / GIB).toFixed(1)} GB`;
}

function driveLabel(d: DriveInfo): string {
  const used = d.total_bytes - d.available_bytes;
  const mount = d.mount_point.replace(/\\$/, "");
  return `${mount} ${formatGiB(used)} / ${formatGiB(d.total_bytes)}`;
}

export function Widgets() {
  const { data } = useSystemInfo();

  const items = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "cpu",
        icon: Cpu,
        value: `${data.cpu_usage.toFixed(0)}%`,
        title: "CPU usage",
      },
      {
        id: "memory",
        icon: MemoryStick,
        value: `${formatGiB(data.memory_used_bytes)} / ${formatGiB(data.memory_total_bytes)}`,
        title: "RAM used / total",
      },
      ...data.drives.map((d) => ({
        id: `drive-${d.mount_point}`,
        icon: HardDrive,
        value: driveLabel(d),
        title: d.name || d.mount_point,
      })),
    ];
  }, [data]);

  return (
    <div className="w-full flex flex-row flex-wrap gap-2 p-1">
      {items.map((item) => (
        <div
          key={item.id}
          title={item.title}
          className="flex flex-row items-center gap-2 px-2 py-1 rounded bg-background/50 text-foreground text-sm"
        >
          <item.icon className="size-4" />
          <span className="text-xs">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
