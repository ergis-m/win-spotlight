import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command } from "@/components/ui/command";
import { hideWindow } from "@/services/search";
import { getSettings } from "@/services/settings";
import { SearchFooter } from "./SearchFooter";
import { PinHandle } from "./PinHandle";
import { LauncherInput } from "./LauncherInput";
import { ResultList } from "./ResultList";
import { useLauncherStore, cycleTab, setSelectedValue, resetLauncher } from "@/stores/launcher";
import { Widgets } from "./Widgets";
import { BigWidgets } from "./BigWidgets";

export function App() {
  const selectedValue = useLauncherStore((s) => s.selectedValue);
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const widgetsMode = settings?.widgets_mode ?? "big";

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      resetLauncher();
      hideWindow();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      cycleTab(e.shiftKey);
    }
  }, []);

  return (
    <div className="relative flex size-full flex-col">
      <PinHandle />
      <Command
        className="rounded-none! bg-background/50 text-foreground p-1"
        shouldFilter={false}
        loop
        value={selectedValue}
        onValueChange={setSelectedValue}
        onKeyDown={handleKeyDown}
      >
        <LauncherInput />
        <ResultList />
        {widgetsMode === "big" && <BigWidgets />}
        {widgetsMode === "small" && <Widgets />}
        <SearchFooter />
      </Command>
    </div>
  );
}
