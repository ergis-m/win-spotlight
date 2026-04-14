import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, PinIcon, PinOffIcon, Download01Icon } from "@hugeicons/core-free-icons";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Update } from "@tauri-apps/plugin-updater";
import { checkForUpdate } from "@/services/updater";

const ONE_HOUR_MS = 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

function Hint({ keys, label }: { keys: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {keys}
      <span>{label}</span>
    </span>
  );
}

function UpdateBadge() {
  const { data: update } = useQuery<Update | null>({
    queryKey: ["update-check"],
    queryFn: async () => {
      if (import.meta.env.DEV) {
        return { version: "dev" } as Update;
      }
      return await checkForUpdate();
    },
    staleTime: FIVE_MINUTES_MS,
    refetchInterval: ONE_HOUR_MS,
  });

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
      <div className="ml-auto flex items-center gap-1.5">
        <UpdateBadge />
        <Button
          variant={pinned ? "outline" : "ghost"}
          size="icon-sm"
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
