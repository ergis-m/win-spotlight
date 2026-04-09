import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { applyTheme, type Theme } from "@/lib/theme";
import { getSettings, setTheme, setLauncherSize } from "@/services/settings";

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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const sizeMutation = useMutation({
    mutationFn: (size: string) => setLauncherSize(size),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-2">
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Theme</ItemTitle>
          <ItemDescription>Select your preferred appearance</ItemDescription>
        </ItemContent>
        <ItemActions>
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
        </ItemActions>
      </Item>
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Launcher size</ItemTitle>
          <ItemDescription>Controls the size and density of the search launcher</ItemDescription>
        </ItemContent>
        <ItemActions>
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
        </ItemActions>
      </Item>
    </div>
  );
}
