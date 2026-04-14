import { useMemo } from "react";
import { CommandInput } from "@/components/ui/command";
import { useLauncherStore, TABS, setQuery } from "@/stores/launcher";
import { setInputElement, focusInput, scrollListToTop } from "@/lib/launcher-lifecycle";
import { TabSwitcher } from "./TabSwitcher";

export function LauncherInput() {
  const query = useLauncherStore((s) => s.query);
  const tab = useLauncherStore((s) => s.tab);
  const placeholder = useMemo(() => TABS.find((t) => t.key === tab)?.placeholder, [tab]);

  return (
    <CommandInput
      ref={setInputElement}
      placeholder={placeholder}
      className="text-xs"
      value={query}
      onValueChange={(v) => {
        setQuery(v);
        scrollListToTop();
      }}
    >
      <TabSwitcher onSelect={focusInput} />
    </CommandInput>
  );
}
