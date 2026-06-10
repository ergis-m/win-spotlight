import { use$ } from "@legendapp/state/react";
import { pinned$ } from "@/services/pin";

export function PinHandle() {
  const pinned = use$(pinned$);
  if (!pinned) return null;
  return (
    <div
      data-tauri-drag-region
      className="relative flex h-4 shrink-0 cursor-grab items-center justify-center hover:bg-background/30"
    >
      <div data-tauri-drag-region className="h-0.5 w-8 rounded-full bg-muted-foreground/40" />
    </div>
  );
}
