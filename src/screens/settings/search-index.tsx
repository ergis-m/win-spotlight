import { useState, useRef, useCallback } from "react";
import { use$ } from "@legendapp/state/react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  PlusSignIcon,
  FolderOpenIcon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import {
  fileSearchSettings$,
  fileIndexStatus$,
  updateFileSearchSettings,
  rebuildIndex,
} from "@/services/settings";

export function IndexingPage() {
  const [newExclude, setNewExclude] = useState("");
  const [newDir, setNewDir] = useState("");
  const [rebuilding, setRebuilding] = useState(false);
  const excludeInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const settings = use$(fileSearchSettings$);
  const status = use$(fileIndexStatus$);

  const handleRebuild = useCallback(async () => {
    setRebuilding(true);
    try {
      await rebuildIndex();
    } finally {
      setRebuilding(false);
    }
  }, []);

  const addDirectory = useCallback(() => {
    if (!settings || !newDir.trim()) return;
    const path = newDir.trim();
    if (!settings.directories.includes(path)) {
      void updateFileSearchSettings({
        ...settings,
        directories: [...settings.directories, path],
      });
    }
    setNewDir("");
    dirInputRef.current?.focus();
  }, [settings, newDir]);

  const removeDirectory = useCallback(
    (dir: string) => {
      if (!settings) return;
      void updateFileSearchSettings({
        ...settings,
        directories: settings.directories.filter((d) => d !== dir),
      });
    },
    [settings],
  );

  const addExclude = useCallback(() => {
    if (!settings || !newExclude.trim()) return;
    const name = newExclude.trim();
    if (!settings.excluded_dirs.includes(name)) {
      void updateFileSearchSettings({
        ...settings,
        excluded_dirs: [...settings.excluded_dirs, name],
      });
    }
    setNewExclude("");
    excludeInputRef.current?.focus();
  }, [settings, newExclude]);

  const removeExclude = useCallback(
    (name: string) => {
      if (!settings) return;
      void updateFileSearchSettings({
        ...settings,
        excluded_dirs: settings.excluded_dirs.filter((d) => d !== name),
      });
    },
    [settings],
  );

  if (!settings) return null;

  const lastIndexed = status?.last_indexed
    ? new Date(status.last_indexed * 1000).toLocaleString()
    : "Never";

  return (
    <div className="flex flex-col gap-2">
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>File search</ItemTitle>
          <ItemDescription>Search files from the launcher</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => void updateFileSearchSettings({ ...settings, enabled })}
          />
        </ItemActions>
      </Item>

      {settings.enabled && (
        <>
          <Item variant="muted" size="sm" className="items-start">
            <ItemContent>
              <ItemTitle>Indexed directories</ItemTitle>
              <ItemDescription>Folders to scan for files</ItemDescription>
              <div className="mt-3 flex flex-col gap-1.5">
                {settings.directories.map((dir) => (
                  <div
                    key={dir}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
                  >
                    <HugeiconsIcon
                      icon={FolderOpenIcon}
                      strokeWidth={2}
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    <span className="flex-1 truncate">{dir}</span>
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => removeDirectory(dir)}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                    </button>
                  </div>
                ))}
                <div className="mt-1 flex gap-2">
                  <Input
                    ref={dirInputRef}
                    value={newDir}
                    onChange={(e) => setNewDir(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addDirectory();
                    }}
                    placeholder="C:\path\to\folder"
                    className="h-8 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 text-xs"
                    onClick={addDirectory}
                    disabled={!newDir.trim()}
                  >
                    <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-3" />
                    Add
                  </Button>
                </div>
              </div>
            </ItemContent>
          </Item>

          <Item variant="muted" size="sm" className="items-start">
            <ItemContent>
              <ItemTitle>Excluded folders</ItemTitle>
              <ItemDescription>Folder names to skip during indexing</ItemDescription>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {settings.excluded_dirs.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                  >
                    {name}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removeExclude(name)}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  ref={excludeInputRef}
                  value={newExclude}
                  onChange={(e) => setNewExclude(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addExclude();
                  }}
                  placeholder="Folder name..."
                  className="h-8 max-w-48 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={addExclude}
                  disabled={!newExclude.trim()}
                >
                  <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-3" />
                  Add
                </Button>
              </div>
            </ItemContent>
          </Item>

          <Item variant="muted" size="sm">
            <ItemContent>
              <ItemTitle>Max folder depth</ItemTitle>
              <ItemDescription>How many levels deep to search</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Select
                value={String(settings.max_depth)}
                onValueChange={(v) =>
                  void updateFileSearchSettings({
                    ...settings,
                    max_depth: parseInt(v),
                  })
                }
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="16">16</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </ItemActions>
          </Item>

          <Item variant="muted" size="sm">
            <ItemContent>
              <ItemTitle>Index status</ItemTitle>
              <ItemDescription>
                {status?.ready
                  ? `${status.file_count.toLocaleString()} files indexed · ${lastIndexed}`
                  : "Indexing..."}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleRebuild}
                disabled={rebuilding}
              >
                <HugeiconsIcon
                  icon={Refresh01Icon}
                  strokeWidth={2}
                  className={`size-3 ${rebuilding ? "animate-spin" : ""}`}
                />
                Rebuild
              </Button>
            </ItemActions>
          </Item>
        </>
      )}
    </div>
  );
}
