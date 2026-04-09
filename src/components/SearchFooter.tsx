import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, PinIcon, PinOffIcon } from "@hugeicons/core-free-icons";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function Hint({ keys, label }: { keys: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {keys}
      <span>{label}</span>
    </span>
  );
}

export function SearchFooter() {
  const queryClient = useQueryClient();
  const { data: pinned = false } = useQuery({
    queryKey: ["pinned"],
    queryFn: () => invoke<boolean>("is_pinned"),
  });

  const handleTogglePin = () => {
    invoke<boolean>("toggle_pin").then((newValue) => {
      queryClient.setQueryData(["pinned"], newValue);
    });
  };

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
      <div className="ml-auto flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          title={pinned ? "Unpin (disable drag)" : "Pin (enable drag)"}
          onClick={handleTogglePin}
        >
          <HugeiconsIcon
            icon={pinned ? PinIcon : PinOffIcon}
            strokeWidth={2}
            className="size-3.5"
          />
        </Button>
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
