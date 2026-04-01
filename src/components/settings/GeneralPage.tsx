import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyTheme, type Theme } from "@/lib/theme";
import { getSettings, setTheme, setAutostart } from "@/services/settings";
import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";

export function GeneralPage() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const themeMutation = useMutation({
    mutationFn: (theme: string) => setTheme(theme),
    onMutate: (theme) => {
      applyTheme(theme as Theme);
      queryClient.setQueryData(["settings"], (prev: typeof settings) =>
        prev ? { ...prev, theme } : prev
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      if (settings) applyTheme(settings.theme as Theme);
    },
  });

  const autostartMutation = useMutation({
    mutationFn: (enabled: boolean) => setAutostart(enabled),
    onMutate: (enabled) => {
      queryClient.setQueryData(["settings"], (prev: typeof settings) =>
        prev ? { ...prev, autostart: enabled } : prev
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-2">
      <SettingsSection>
        <SettingsRow
          title="Theme"
          description="Select your preferred appearance"
        >
          <Select value={settings.theme} onValueChange={(v) => themeMutation.mutate(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>
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
