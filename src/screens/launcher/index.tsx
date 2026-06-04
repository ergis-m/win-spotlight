import { useCallback } from "react";
import { use$ } from "@legendapp/state/react";
import { Command, CommandEmpty } from "@/components/ui/command";
import { hideWindow } from "@/services/search";
import { settings$ } from "@/services/settings";
import { SearchFooter } from "@/components/SearchFooter";
import { PinHandle } from "@/components/PinHandle";
import { LauncherInput } from "@/components/LauncherInput";
import { ResultList } from "@/components/ResultList";
import { launcher$, cycleTab, setSelectedValue, resetLauncher } from "@/stores/launcher";
import { WidgetArea } from "@/layouts/WidgetArea";

export function App() {
  const selectedValue = use$(launcher$.selectedValue);
  const settings = use$(settings$);
  const widgets = settings?.widgets;
  const showWidgetHome = widgets?.enabled && widgets.layout.length > 0;

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
        {showWidgetHome && (
          <CommandEmpty>
            <div className="flex-1 min-h-0 overflow-auto scrollbar-thin mt-1">
              <WidgetArea layout={widgets.layout} />
            </div>
          </CommandEmpty>
        )}
        <ResultList />
        <SearchFooter />
      </Command>
    </div>
  );
}
