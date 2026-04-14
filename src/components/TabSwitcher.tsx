import { useLauncherStore, TABS, setTab } from "@/stores/launcher";

export function TabSwitcher({ onSelect }: { onSelect?: () => void }) {
  const tab = useLauncherStore((s) => s.tab);
  return (
    <div className="flex items-center gap-0.5">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
            tab === t.key
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => {
            setTab(t.key);
            onSelect?.();
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
