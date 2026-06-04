import { observable, type Observable } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { use$ } from "@legendapp/state/react";
import { poll } from "@/lib/sync-helpers";

/**
 * Returns `Date.now()` and re-renders every `ms` so widgets that tick (clock,
 * uptime) stay current. Project rule: no useEffect — the cadence comes from a
 * synced observable's interval subscription, one per distinct `ms`.
 */
const ticks = new Map<number, Observable<number>>();

function tickFor(ms: number): Observable<number> {
  let tick$ = ticks.get(ms);
  if (!tick$) {
    tick$ = observable(
      synced<number>({
        get: () => Date.now(),
        subscribe: ({ refresh }) => poll(refresh, ms),
        initial: Date.now(),
      }),
    );
    ticks.set(ms, tick$);
  }
  return tick$;
}

export function useTick(ms: number): number {
  return use$(tickFor(ms));
}
