import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getVersion } from "@tauri-apps/api/app";
import { useQuery } from "@tanstack/react-query";
import {
  type UpdateStatus,
  checkForUpdate,
  downloadAndInstall,
} from "@/services/updater";

export function AboutPage() {
  const { data: appVersion } = useQuery({
    queryKey: ["app-version"],
    queryFn: getVersion,
    staleTime: Infinity,
  });

  const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });

  const handleCheckForUpdate = useCallback(async () => {
    setStatus({ state: "checking" });
    try {
      const update = await checkForUpdate();
      if (update) {
        setStatus({ state: "available", update, version: update.version });
      } else {
        setStatus({ state: "upToDate" });
      }
    } catch (e) {
      setStatus({ state: "error", message: String(e) });
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (status.state !== "available") return;
    const { update } = status;
    setStatus({ state: "downloading", progress: 0 });
    try {
      await downloadAndInstall(update, (progress) => {
        setStatus({ state: "downloading", progress });
      });
      setStatus({ state: "installing" });
    } catch (e) {
      setStatus({ state: "error", message: String(e) });
    }
  }, [status]);

  return (
    <div className="flex flex-col gap-2">
      <Card className="py-0">
        <CardContent className="p-4">
          <div className="text-sm font-semibold">Win Spotlight</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Version {appVersion ?? "..."}
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-semibold">Updates</div>
            <div className="mt-1 text-xs text-muted-foreground">
              <StatusText status={status} />
            </div>
          </div>
          <div>
            {status.state === "available" ? (
              <Button size="sm" onClick={handleInstall}>
                Install v{status.version}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCheckForUpdate}
                disabled={
                  status.state === "checking" ||
                  status.state === "downloading" ||
                  status.state === "installing"
                }
              >
                {status.state === "checking" ? "Checking..." : "Check for updates"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusText({ status }: { status: UpdateStatus }) {
  switch (status.state) {
    case "idle":
      return "Click to check for updates";
    case "checking":
      return "Checking for updates...";
    case "available":
      return `Version ${status.version} is available`;
    case "downloading":
      return `Downloading... ${status.progress}%`;
    case "installing":
      return "Installing update, restarting...";
    case "upToDate":
      return "You're on the latest version";
    case "error":
      return `Update failed: ${status.message}`;
  }
}
