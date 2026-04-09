import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { Kbd } from "@/components/ui/kbd";
import { getVersion } from "@tauri-apps/api/app";
import { getSettings, setAutostart } from "@/services/settings";
import { type UpdateStatus, checkForUpdate, downloadAndInstall } from "@/services/updater";

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
    mutationFn: (enabled: boolean) => {
      console.log("[autostart] mutating:", enabled);
      return setAutostart(enabled);
    },
    onSuccess: () => {
      console.log("[autostart] success");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => {
      console.error("[autostart] error:", err);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-2">
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Win Spotlight</ItemTitle>
          <ItemDescription>Version {appVersion ?? "..."}</ItemDescription>
        </ItemContent>
      </Item>

      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Updates</ItemTitle>
          <ItemDescription>
            <StatusText status={updateStatus} />
          </ItemDescription>
        </ItemContent>
        <ItemActions>
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
        </ItemActions>
      </Item>

      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Launch at login</ItemTitle>
          <ItemDescription>Start Win Spotlight when you sign in to Windows</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch
            checked={autostartMutation.isPending ? autostartMutation.variables : settings.autostart}
            disabled={autostartMutation.isPending}
            onCheckedChange={(v) => autostartMutation.mutate(v)}
          />
        </ItemActions>
      </Item>

      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Activation shortcut</ItemTitle>
          <ItemDescription>Press this shortcut to open the launcher</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Kbd>Alt + Space</Kbd>
        </ItemActions>
      </Item>
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
