import { observable } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { getVersion } from "@tauri-apps/api/app";

/** The app version. Fetched once — it never changes during a session. */
export const appVersion$ = observable(synced<string>({ get: getVersion }));
