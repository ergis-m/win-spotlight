import { check, type Update } from "@tauri-apps/plugin-updater";
import { observable } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { poll } from "@/lib/sync-helpers";

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Background update check shown in the launcher footer; re-checks hourly. */
export const updateCheck$ = observable(
  synced<Update | null>({
    get: () => (import.meta.env.DEV ? ({ version: "dev" } as Update) : checkForUpdate()),
    subscribe: ({ refresh }) => poll(refresh, ONE_HOUR_MS),
    initial: null,
  }),
);

export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; update: Update; version: string }
  | { state: "downloading"; progress: number }
  | { state: "installing" }
  | { state: "upToDate" }
  | { state: "error"; message: string };

export async function checkForUpdate(): Promise<Update | null> {
  return await check();
}

export async function downloadAndInstall(
  update: Update,
  onProgress?: (progress: number) => void,
): Promise<void> {
  let totalLength = 0;
  let downloaded = 0;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started" && event.data.contentLength) {
      totalLength = event.data.contentLength;
    } else if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      if (totalLength > 0 && onProgress) {
        onProgress(Math.round((downloaded / totalLength) * 100));
      }
    }
  });
}
