import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export function PinHandle() {
  const { data: pinned = false } = useQuery({
    queryKey: ["pinned"],
    queryFn: () => invoke<boolean>("is_pinned"),
  });
  if (!pinned) return null;
  return (
    <div
      data-tauri-drag-region
      className="relative flex h-4 cursor-grab items-center justify-center bg-background/50 hover:bg-background/30"
    >
      <div data-tauri-drag-region className="h-0.5 w-8 rounded-full bg-muted-foreground/40" />
    </div>
  );
}
