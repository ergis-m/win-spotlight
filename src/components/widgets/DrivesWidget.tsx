import { HardDrive } from "lucide-react";
import { useSystemInfo, driveHistoryKey, type DriveInfo } from "@/services/system";
import { colorForId } from "@/lib/widget-colors";
import { Tile } from "./Tile";
import { TileHeader } from "./primitives";

const GIB = 1024 ** 3;
const fmt = (b: number) => `${(b / GIB).toFixed(1)} GB`;

function DriveRow({ drive }: { drive: DriveInfo }) {
  const used = drive.total_bytes - drive.available_bytes;
  const pct = drive.total_bytes ? (used / drive.total_bytes) * 100 : 0;
  const mount = drive.mount_point.replace(/\\$/, "");
  const color = colorForId(driveHistoryKey(drive.mount_point));
  return (
    <div className="relative h-4 rounded overflow-hidden bg-foreground/5">
      <div
        className="absolute inset-y-0 left-0"
        style={{
          background: color.fill,
          width: `${pct}%`,
          boxShadow: `0 0 10px ${color.fill}`,
        }}
      />
      <div className="relative flex h-full items-center gap-1.5 px-1.5 text-[10px]">
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

export function DrivesWidget() {
  const { data } = useSystemInfo();
  if (!data) return null;
  const color = colorForId("drives");
  return (
    <Tile>
      <div className="flex h-full flex-col gap-1.5">
        <TileHeader
          label="Drives"
          color={color}
          right={
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {data.drives.length}
              </span>
              <HardDrive className="size-4 shrink-0 text-muted-foreground" />
            </div>
          }
        />
        <div className="flex flex-col gap-1 overflow-hidden">
          {data.drives.map((d) => (
            <DriveRow key={d.mount_point} drive={d} />
          ))}
        </div>
      </div>
    </Tile>
  );
}
