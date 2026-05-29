import { useQuery } from "@tanstack/react-query";

/**
 * Returns `Date.now()` and refetches every `ms` to force a re-render. Used by
 * widgets that need to tick (clock, uptime). Project rule: no useEffect — this
 * leans on TanStack Query's interval to drive the cadence. `initialData` seeds
 * the first value so the impure `Date.now()` stays out of the render body.
 */
export function useTick(ms: number): number {
  const { data } = useQuery({
    queryKey: ["tick", ms],
    queryFn: () => Date.now(),
    initialData: () => Date.now(),
    refetchInterval: ms,
    refetchIntervalInBackground: false,
    staleTime: 0,
    gcTime: 0,
  });
  return data;
}
