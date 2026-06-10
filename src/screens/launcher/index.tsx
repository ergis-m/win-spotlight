import { useCallback } from "react";
import { use$ } from "@legendapp/state/react";
import { AnimatePresence, motion } from "motion/react";
import { Command } from "@/components/ui/command";
import { hideWindow } from "@/services/search";
import { settings$ } from "@/services/settings";
import { SearchFooter } from "@/components/SearchFooter";
import { PinHandle } from "@/components/PinHandle";
import { LauncherInput } from "@/components/LauncherInput";
import { ResultList } from "@/components/ResultList";
import { launcher$, cycleTab, setSelectedValue, resetLauncher } from "@/stores/launcher";
import { WidgetArea } from "@/layouts/WidgetArea";
import { LauncherWrapper } from "@/components/launcher/LauncherWrapper";

export function App() {
  const selectedValue = use$(launcher$.selectedValue);
  const settings = use$(settings$);
  const hasQuery = use$(() => launcher$.rawQuery.get().length > 0);
  const widgets = settings?.widgets;
  const showWidgetHome = !hasQuery && widgets?.enabled && widgets.layout.length > 0;
  const expanded = hasQuery || !!showWidgetHome;

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
    <LauncherWrapper>
      <PinHandle />
      <Command
        data-expanded={expanded}
        className="rounded-none! bg-transparent text-foreground min-h-0 p-0"
        shouldFilter={false}
        loop
        value={selectedValue}
        onValueChange={setSelectedValue}
        onKeyDown={handleKeyDown}
      >
        <LauncherInput />
        {/* popLayout pops the exiting sheet out of the layout flow, so the
            window starts collapsing immediately while the content fades in place. */}
        <AnimatePresence mode="popLayout">
          {expanded && (
            <motion.div
              key="sheet"
              className="flex min-h-0 flex-col"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            >
              {showWidgetHome && (
                <div className="min-h-0 overflow-auto scrollbar-thin mt-1">
                  <WidgetArea layout={widgets.layout} />
                </div>
              )}
              {hasQuery && <ResultList />}
              <SearchFooter />
            </motion.div>
          )}
        </AnimatePresence>
      </Command>
    </LauncherWrapper>
  );
}
