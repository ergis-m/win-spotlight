import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyTheme, type Theme } from "@/lib/theme";
import { getSettings, setTheme, setLauncherSize } from "@/services/settings";
import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";

export function AppearancePage() {
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

  const sizeMutation = useMutation({
    mutationFn: (size: string) => setLauncherSize(size),
    onMutate: (size) => {
      queryClient.setQueryData(["settings"], (prev: typeof settings) =>
        prev ? { ...prev, launcher_size: size } : prev
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
          title="Launcher size"
          description="Controls the size and density of the search launcher"
        >
          <Select value={settings.launcher_size} onValueChange={(v) => sizeMutation.mutate(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="fancy">Fancy</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
