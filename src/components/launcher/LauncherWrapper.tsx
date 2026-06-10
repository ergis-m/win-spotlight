import type { PropsWithChildren } from "react";
import { invoke } from "@tauri-apps/api/core";
import { use$ } from "@legendapp/state/react";
import { settings$ } from "@/services/settings";

// Max panel height per launcher size — keep in sync with
// `LauncherSize::dimensions` in src-tauri/src/settings.rs.
const MAX_HEIGHT: Record<string, number> = { compact: 440, normal: 540, fancy: 660 };

export const LauncherWrapper = (props: PropsWithChildren) => {
  const launcherSize = use$(settings$.launcher_size);
  const maxHeight = MAX_HEIGHT[launcherSize] ?? MAX_HEIGHT.normal;

  // The window is spring-animated vertically to the content height by the
  // backend (set_launcher_height), so the acrylic backdrop hugs the panel.
  const measureRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    const report = () => invoke("set_launcher_height", { height: el.offsetHeight });
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  };

  return (
    <div className="relative size-full overflow-hidden">
      <div className="isolate absolute inset-0">
        <div className="meshy absolute inset-0" />
        <div className="noise absolute inset-0" />
      </div>
      {/* Sheet color fills the whole window, not just the content, so the
          animating window edge never reveals an unpainted strip. */}
      <div className="absolute inset-0 bg-background/50" />
      <div ref={measureRef} style={{ maxHeight }} className="relative flex w-full flex-col">
        {props.children}
      </div>
    </div>
  );
};
