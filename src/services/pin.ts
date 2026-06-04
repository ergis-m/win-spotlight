import { observable } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { invoke } from "@tauri-apps/api/core";
import { onFocus } from "@/lib/sync-helpers";

/** Whether the launcher window is pinned (drag enabled / stays open on blur). */
export const pinned$ = observable(
  synced<boolean>({
    get: () => invoke<boolean>("is_pinned"),
    subscribe: ({ refresh }) => onFocus(refresh),
    initial: false,
  }),
);

export function togglePin() {
  void invoke<boolean>("toggle_pin").then((next) => pinned$.set(next));
}
