import { useMemo, type RefObject } from "react";
import { CommandInput } from "@/components/ui/command";
import { useLauncherStore, TABS, setQuery } from "@/stores/launcher";
import { TabSwitcher } from "./TabSwitcher";

export function LauncherInput({
  inputRef,
  onAfterChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onAfterChange?: () => void;
}) {
  const query = useLauncherStore((s) => s.query);
  const tab = useLauncherStore((s) => s.tab);
  const placeholder = useMemo(() => TABS.find((t) => t.key === tab)?.placeholder, [tab]);

  return (
    <CommandInput
      ref={inputRef}
      placeholder={placeholder}
      className="text-xs"
      value={query}
      onValueChange={(v) => {
        setQuery(v);
        onAfterChange?.();
      }}
    >
      <TabSwitcher onSelect={() => inputRef.current?.focus()} />
    </CommandInput>
  );
}
