import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, PinIcon, PinOffIcon, Download01Icon } from "@hugeicons/core-free-icons";
import { invoke } from "@tauri-apps/api/core";
import { use$ } from "@legendapp/state/react";
import { pinned$, togglePin } from "@/services/pin";
import { updateCheck$ } from "@/services/updater";

function Hint({ keys, label }: { keys: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {keys}
      <span>{label}</span>
    </span>
  );
}

function UpdateBadge() {
  const update = use$(updateCheck$);

  if (!update) return null;

  return (
    <Button
      size="xs"
      variant="outline"
      onClick={() => invoke("open_settings")}
      title={`Version ${update.version} available — open Settings to install`}
      className="text-info"
    >
      <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
      Update available
    </Button>
  );
}

export function SearchFooter() {
  const pinned = use$(pinned$);

  return (
    <div className="flex items-center border-t px-2 py-1">
      <div className="flex items-center gap-3">
        <Hint
          keys={
            <>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
            </>
          }
          label="navigate"
        />
        <Hint keys={<Kbd>↵</Kbd>} label="open" />
        <Hint keys={<Kbd>esc</Kbd>} label="dismiss" />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <UpdateBadge />
        <Button
          variant={pinned ? "outline" : "ghost"}
          size="icon-sm"
          title={pinned ? "Unpin (disable drag)" : "Pin (enable drag)"}
          onClick={() => togglePin()}
        >
          <HugeiconsIcon
            icon={pinned ? PinIcon : PinOffIcon}
            strokeWidth={2}
            className="size-3.5"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Settings"
          onClick={() => invoke("open_settings")}
        >
          <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
