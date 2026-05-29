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
import { WidgetArea } from "./WidgetArea";

export function App() {
  const selectedValue = useLauncherStore((s) => s.selectedValue);
  const query = useLauncherStore((s) => s.query);
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const widgets = settings?.widgets;
  // Empty input = home screen. Anything typed (even whitespace stripped) hands
  // the area over to the result list.
  const showHome = query.trim().length === 0;
  const showWidgetHome = showHome && widgets?.enabled && widgets.layout.length > 0;

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
        {showWidgetHome ? (
          <div className="flex-1 min-h-0 overflow-auto scrollbar-thin mt-1">
            <WidgetArea layout={widgets.layout} />
          </div>
        ) : showHome ? (
          <div className="flex-1 min-h-0" />
        ) : (
          <ResultList />
        )}
        <SearchFooter />
      </Command>
    </div>
  );
}
