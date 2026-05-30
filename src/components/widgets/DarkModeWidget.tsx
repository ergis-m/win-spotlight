import { MoonStar, Sun } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colorForId } from "@/lib/widget-colors";
import type { WidgetConfig } from "@/lib/widgets/types";
import { setSystemDarkMode, useSystemDarkMode } from "@/services/system";
import { ActionTile } from "./primitives";

const QUERY_KEY = ["system-dark-mode"];

/**
 * A 1×1 toggle for the Windows system theme (not the app's own theme). Reflects
 * the live OS state and flips it on click, updating the icon optimistically.
 */
export function DarkModeWidget(_props: { config: WidgetConfig }) {
  const queryClient = useQueryClient();
  const { data } = useSystemDarkMode();
  const isDark = data ?? false;
  const color = colorForId("dark-mode");

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

  return (
    <ActionTile
      label={isDark ? "Dark" : "Light"}
      icon={isDark ? MoonStar : Sun}
      color={color}
      active={isDark}
      pending={mutation.isPending}
      onActivate={() => mutation.mutate(!isDark)}
    />
  );
}
