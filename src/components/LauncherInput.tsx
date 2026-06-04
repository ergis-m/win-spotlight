import { useMemo } from "react";
import { use$ } from "@legendapp/state/react";
import { CommandInput } from "@/components/ui/command";
import { launcher$, TABS, setQuery } from "@/stores/launcher";
import { setInputElement, focusInput, scrollListToTop } from "@/lib/launcher-lifecycle";
import { TabSwitcher } from "./TabSwitcher";

export function LauncherInput() {
  const rawQuery = use$(launcher$.rawQuery);
  const tab = use$(launcher$.tab);
  const placeholder = useMemo(() => TABS.find((t) => t.key === tab)?.placeholder, [tab]);

  return (
    <CommandInput
      ref={setInputElement}
      placeholder={placeholder}
      className="text-xs"
      value={rawQuery}
      onValueChange={(v) => {
        setQuery(v);
        scrollListToTop();
      }}
    >
      <TabSwitcher onSelect={focusInput} />
    </CommandInput>
  );
}
