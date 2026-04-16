import { useCallback } from "react";
import { Command } from "@/components/ui/command";
import { hideWindow } from "@/services/search";
import { SearchFooter } from "./SearchFooter";
import { PinHandle } from "./PinHandle";
import { LauncherInput } from "./LauncherInput";
import { ResultList } from "./ResultList";
import { useLauncherStore, cycleTab, setSelectedValue, resetLauncher } from "@/stores/launcher";

export function App() {
  const selectedValue = useLauncherStore((s) => s.selectedValue);

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
        <SearchFooter />
      </Command>
    </div>
  );
}
