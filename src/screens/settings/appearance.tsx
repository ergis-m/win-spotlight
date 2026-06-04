import { use$ } from "@legendapp/state/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { settings$, updateTheme, updateLauncherSize } from "@/services/settings";

export function AppearancePage() {
  const settings = use$(settings$);

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-2">
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Theme</ItemTitle>
          <ItemDescription>Select your preferred appearance</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Select value={settings.theme} onValueChange={updateTheme}>
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
          <Select value={settings.launcher_size} onValueChange={updateLauncherSize}>
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
