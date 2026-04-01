import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSettings, setLauncherSize } from "@/services/settings";
import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";

export function AppearancePage() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
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
