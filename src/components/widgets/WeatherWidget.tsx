import { CloudOff } from "lucide-react";
import { useWeather, type WeatherHour, type UnitPreference } from "@/services/weather";
import { lookForCode } from "@/lib/weather-codes";
import type { WidgetColor } from "@/lib/widget-colors";
import type { WidgetConfig } from "@/lib/widgets/types";
import Tile from "./Tile";
import { TileHeader, Value } from "./primitives";

// Sky-blue accent + gradient, echoing the Figma weather card rather than a
// hashed per-id hue, so the temperature and icons read on the blue backdrop.
const color: WidgetColor = {
  stroke: "hsl(200 95% 82%)",
  fill: "hsl(200 95% 82% / 0.25)",
};

const deg = (t: number) => `${Math.round(t)}°`;

function formatHour(ms: number): string {
  const h = new Date(ms).getHours();
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${period}`;
}

function HourCell({ hour }: { hour: WeatherHour }) {
  const { icon: Icon } = lookForCode(hour.code, hour.isDay);
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
        {formatHour(hour.time)}
      </span>
      <Icon className="size-4" style={{ color: color.stroke }} />
      <span className="text-[11px] font-semibold tabular-nums text-white/90">{deg(hour.temp)}</span>
    </div>
  );
}

function WeatherShell({ children }: { children: React.ReactNode }) {
  return (
    <Tile>
      {/* Smooth sky gradient backdrop, clipped to the tile's rounded corners. */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/40 via-blue-700/30 to-blue-950/45" />
      <div className="relative flex h-full flex-col">
        <TileHeader label="Weather" color={color} />
        {children}
      </div>
    </Tile>
  );
}

export function WeatherWidget({ config }: { config: WidgetConfig }) {
  const unit = (typeof config.unit === "string" ? config.unit : "auto") as UnitPreference;
  const { data, isError } = useWeather(unit);

  if (isError) {
    return (
      <WeatherShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-white/70">
          <CloudOff className="size-5" />
          <span className="text-[11px]">Weather unavailable</span>
        </div>
      </WeatherShell>
    );
  }

  if (!data) {
    return (
      <WeatherShell>
        <div className="flex flex-1 items-center justify-center text-[11px] text-white/70">
          Loading weather…
        </div>
      </WeatherShell>
    );
  }

  const current = lookForCode(data.current.code, data.current.isDay);
  const CurrentIcon = current.icon;

  return (
    <WeatherShell>
      <div className="flex flex-1 min-h-0 items-center gap-4">
        {/* Current conditions */}
        <div className="flex shrink-0 items-center gap-2.5">
          <CurrentIcon
            className="size-11 shrink-0"
            style={{
              color: color.stroke,
              filter: `drop-shadow(0 0 12px ${color.fill})`,
            }}
          />
          <div className="min-w-0">
            <Value color={color}>{deg(data.current.temp)}</Value>
            <div className="mt-1 text-xs font-medium text-white/90 truncate">{current.label}</div>
            <div className="text-[11px] text-white/60 truncate">{data.location}</div>
          </div>
        </div>

        {/* Hourly forecast */}
        <div className="flex flex-1 items-center justify-between gap-1 border-l border-white/10 pl-3">
          {data.hourly.map((hour) => (
            <HourCell key={hour.time} hour={hour} />
          ))}
        </div>
      </div>
    </WeatherShell>
  );
}
