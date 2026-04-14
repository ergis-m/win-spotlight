import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Command } from "@/components/ui/command";
import { hideWindow } from "@/services/search";
import { loadAndApplySettings } from "@/lib/theme";
import { SearchFooter } from "./SearchFooter";
import { PinHandle } from "./PinHandle";
import { LauncherInput } from "./LauncherInput";
import { ResultList } from "./ResultList";
import {
  useLauncherStore,
  setQuery,
  cycleTab,
  setSelectedValue,
  resetLauncher,
} from "@/stores/launcher";

export function App() {
  const selectedValue = useLauncherStore((s) => s.selectedValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const fillHint = useCallback((example: string) => {
    setQuery(example);
    inputRef.current?.focus();
  }, []);

  const handleWindowFocus = useCallback(() => {
    resetLauncher();
    queryClient.invalidateQueries({ queryKey: ["search"] });
    inputRef.current?.focus();
    loadAndApplySettings();
  }, [queryClient]);

  const focusListenerRef = useRef<(() => void) | null>(null);
  const commandRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (focusListenerRef.current) {
        window.removeEventListener("focus", focusListenerRef.current);
        focusListenerRef.current = null;
      }
      if (node) {
        focusListenerRef.current = handleWindowFocus;
        window.addEventListener("focus", handleWindowFocus);
      }
    },
    [handleWindowFocus],
  );

  return (
    <div className="relative flex size-full flex-col">
      <PinHandle />
      <Command
        ref={commandRef}
        className="rounded-none! bg-background/20 text-foreground p-1"
        shouldFilter={false}
        loop
        value={selectedValue}
        onValueChange={setSelectedValue}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            resetLauncher();
            hideWindow();
          }
          if (e.key === "Tab") {
            e.preventDefault();
            cycleTab(e.shiftKey);
          }
        }}
      >
        <LauncherInput inputRef={inputRef} onAfterChange={() => listRef.current?.scrollTo(0, 0)} />
        <ResultList ref={listRef} onFillHint={fillHint} />
        <SearchFooter />
      </Command>
    </div>
  );
}
