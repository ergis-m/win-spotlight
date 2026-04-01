import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}

function Hint({ keys, label }: { keys: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {keys}
      <span>{label}</span>
    </span>
  );
}

export function SearchFooter() {
  return (
    <div className="flex items-center border-t px-2 py-1">
      <div className="flex items-center gap-3">
        <Hint keys={<><Kbd>↑</Kbd><Kbd>↓</Kbd></>} label="navigate" />
        <Hint keys={<Kbd>↵</Kbd>} label="open" />
        <Hint keys={<Kbd>esc</Kbd>} label="dismiss" />
      </div>
      <div className="ml-auto">
        <Button
          variant="ghost"
          size="icon-xs"
          title="Settings"
          onClick={() => invoke("open_settings")}
        >
          <Settings className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
