import { check, type Update } from "@tauri-apps/plugin-updater";

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
