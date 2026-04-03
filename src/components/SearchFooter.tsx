import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import { invoke } from "@tauri-apps/api/core";

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
          <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
