import { MoonStar, Sun } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { colorForId } from "@/lib/widget-colors";
import type { WidgetConfig } from "@/lib/widgets/types";
import { setSystemDarkMode, useSystemDarkMode } from "@/services/system";
import { Tile } from "./Tile";

const QUERY_KEY = ["system-dark-mode"];

/**
 * A 1×1 toggle for the Windows system theme (not the app's own theme). Reflects
 * the live OS state and flips it on click, updating optimistically. Built by
 * composing the interactive `Tile` shell — behavior and accent live here, at the
 * call site, rather than inside the primitive.
 */
export function DarkModeWidget(_props: { config: WidgetConfig }) {
  const queryClient = useQueryClient();
  const { data } = useSystemDarkMode();
  const isDark = data ?? false;
  const color = colorForId("dark-mode");
  const accent = isDark ? { color: color.stroke } : undefined;

  const mutation = useMutation({
    mutationFn: (next: boolean) => setSystemDarkMode(next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<boolean>(QUERY_KEY);
      queryClient.setQueryData(QUERY_KEY, next);
      return { prev };
    },
    onError: (_err, _next, ctx) => {
      if (ctx) queryClient.setQueryData(QUERY_KEY, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const Icon = isDark ? MoonStar : Sun;

  return (
    <Tile
      asChild
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 p-2",
        "transition-[transform,filter] duration-150 hover:brightness-110 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
      style={
        isDark
          ? { boxShadow: `inset 0 0 0 1.5px ${color.stroke}, 0 0 18px ${color.fill}` }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => mutation.mutate(!isDark)}
        disabled={mutation.isPending}
        aria-label="Toggle system dark mode"
        aria-pressed={isDark}
      >
        <Tile.Icon
          icon={Icon}
          style={isDark ? { ...accent, filter: `drop-shadow(0 0 10px ${color.fill})` } : undefined}
        />
        <Tile.Label style={accent}>{isDark ? "Dark" : "Light"}</Tile.Label>
      </button>
    </Tile>
  );
}
