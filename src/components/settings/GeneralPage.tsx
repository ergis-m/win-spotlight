import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getVersion } from "@tauri-apps/api/app";
import { getSettings, setAutostart } from "@/services/settings";
import { type UpdateStatus, checkForUpdate, downloadAndInstall } from "@/services/updater";
import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";

export function GeneralPage() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const { data: appVersion } = useQuery({
    queryKey: ["app-version"],
    queryFn: getVersion,
    staleTime: Infinity,
  });

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });

  const handleCheckForUpdate = useCallback(async () => {
    setUpdateStatus({ state: "checking" });
    try {
      const update = await checkForUpdate();
      if (update) {
        setUpdateStatus({ state: "available", update, version: update.version });
      } else {
        setUpdateStatus({ state: "upToDate" });
      }
    } catch (e) {
      setUpdateStatus({ state: "error", message: String(e) });
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (updateStatus.state !== "available") return;
    const { update } = updateStatus;
    setUpdateStatus({ state: "downloading", progress: 0 });
    try {
      await downloadAndInstall(update, (progress) => {
        setUpdateStatus({ state: "downloading", progress });
      });
      setUpdateStatus({ state: "installing" });
    } catch (e) {
      setUpdateStatus({ state: "error", message: String(e) });
    }
  }, [updateStatus]);

  const autostartMutation = useMutation({
    mutationFn: (enabled: boolean) => setAutostart(enabled),
    onMutate: (enabled) => {
      queryClient.setQueryData(["settings"], (prev: typeof settings) =>
        prev ? { ...prev, autostart: enabled } : prev,
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-2">
      <Card className="py-0">
        <CardContent className="p-4">
          <div className="text-sm font-semibold">Win Spotlight</div>
          <div className="mt-1 text-xs text-muted-foreground">Version {appVersion ?? "..."}</div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-semibold">Updates</div>
            <div className="mt-1 text-xs text-muted-foreground">
              <StatusText status={updateStatus} />
            </div>
          </div>
          <div>
            {updateStatus.state === "available" ? (
              <Button size="sm" onClick={handleInstall}>
                Install v{updateStatus.version}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCheckForUpdate}
                disabled={
                  updateStatus.state === "checking" ||
                  updateStatus.state === "downloading" ||
                  updateStatus.state === "installing"
                }
              >
                {updateStatus.state === "checking" ? "Checking..." : "Check for updates"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <SettingsSection>
        <SettingsRow
          title="Launch at login"
          description="Start Win Spotlight when you sign in to Windows"
        >
          <Switch
            checked={settings.autostart}
            onCheckedChange={(v) => autostartMutation.mutate(v)}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection>
        <SettingsRow
          title="Activation shortcut"
          description="Press this shortcut to open the launcher"
        >
          <span className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Alt + Space
          </span>
        </SettingsRow>
      </SettingsSection>
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
