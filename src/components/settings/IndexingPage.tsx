import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { X, Plus, FolderOpen, RefreshCw } from "lucide-react";
import {
  getFileSearchSettings,
  setFileSearchSettings,
  getFileIndexStatus,
  rebuildFileIndex,
  type FileSearchSettings,
} from "@/services/settings";
import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";

export function IndexingPage() {
  const queryClient = useQueryClient();
  const [newExclude, setNewExclude] = useState("");
  const [newDir, setNewDir] = useState("");
  const excludeInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["file-search-settings"],
    queryFn: getFileSearchSettings,
  });

  const { data: status } = useQuery({
    queryKey: ["file-index-status"],
    queryFn: getFileIndexStatus,
    refetchInterval: 3000,
  });

  const updateSettings = useMutation({
    mutationFn: (updated: FileSearchSettings) =>
      setFileSearchSettings(updated),
    onMutate: (updated) => {
      queryClient.setQueryData(["file-search-settings"], updated);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["file-index-status"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["file-search-settings"] });
    },
  });

  const rebuildMutation = useMutation({
    mutationFn: rebuildFileIndex,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["file-index-status"] });
    },
  });

  const addDirectory = useCallback(() => {
    if (!settings || !newDir.trim()) return;
    const path = newDir.trim();
    if (!settings.directories.includes(path)) {
      updateSettings.mutate({
        ...settings,
        directories: [...settings.directories, path],
      });
    }
    setNewDir("");
    dirInputRef.current?.focus();
  }, [settings, newDir, updateSettings]);

  const removeDirectory = useCallback(
    (dir: string) => {
      if (!settings) return;
      updateSettings.mutate({
        ...settings,
        directories: settings.directories.filter((d) => d !== dir),
      });
    },
    [settings, updateSettings],
  );

  const addExclude = useCallback(() => {
    if (!settings || !newExclude.trim()) return;
    const name = newExclude.trim();
    if (!settings.excluded_dirs.includes(name)) {
      updateSettings.mutate({
        ...settings,
        excluded_dirs: [...settings.excluded_dirs, name],
      });
    }
    setNewExclude("");
    excludeInputRef.current?.focus();
  }, [settings, newExclude, updateSettings]);

  const removeExclude = useCallback(
    (name: string) => {
      if (!settings) return;
      updateSettings.mutate({
        ...settings,
        excluded_dirs: settings.excluded_dirs.filter((d) => d !== name),
      });
    },
    [settings, updateSettings],
  );

  if (!settings) return null;

  const lastIndexed = status?.last_indexed
    ? new Date(status.last_indexed * 1000).toLocaleString()
    : "Never";

  return (
    <div className="flex flex-col gap-2">
      <SettingsSection>
        <SettingsRow
          title="File search"
          description="Search files from the launcher"
        >
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) =>
              updateSettings.mutate({ ...settings, enabled })
            }
          />
        </SettingsRow>
      </SettingsSection>

      {settings.enabled && (
        <>
          <SettingsSection>
            <div className="px-4 py-3.5">
              <div className="text-sm font-medium">Indexed directories</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Folders to scan for files
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                {settings.directories.map((dir) => (
                  <div
                    key={dir}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
                  >
                    <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{dir}</span>
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => removeDirectory(dir)}
                    >
                      <X className="size-3" />
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
                    <Plus className="size-3" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection>
            <div className="px-4 py-3.5">
              <div className="text-sm font-medium">Excluded folders</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Folder names to skip during indexing
              </div>
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
                      <X className="size-2.5" />
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
                  <Plus className="size-3" />
                  Add
                </Button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection>
            <SettingsRow
              title="Max folder depth"
              description="How many levels deep to search"
            >
              <Select
                value={String(settings.max_depth)}
                onValueChange={(v) =>
                  updateSettings.mutate({
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
            </SettingsRow>
          </SettingsSection>

          <SettingsSection>
            <SettingsRow
              title="Index status"
              description={
                status?.ready
                  ? `${status.file_count.toLocaleString()} files indexed · ${lastIndexed}`
                  : "Indexing..."
              }
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => rebuildMutation.mutate()}
                disabled={rebuildMutation.isPending}
              >
                <RefreshCw
                  className={`size-3 ${rebuildMutation.isPending ? "animate-spin" : ""}`}
                />
                Rebuild
              </Button>
            </SettingsRow>
          </SettingsSection>
        </>
      )}
    </div>
  );
}
