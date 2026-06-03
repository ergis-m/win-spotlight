import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Settings, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WIDGETS, getWidget, reconcileLayout } from "@/lib/widgets/registry";
import { resolveConfig } from "@/lib/widgets/config";
import {
  clampSize,
  entrySize,
  GRID_COLUMNS,
  resolveGridSize,
  type ConfigField,
  type WidgetDefinition,
  type WidgetLayoutEntry,
  type WidgetsConfig,
} from "@/lib/widgets/types";
import { useGridEditor } from "@/lib/widgets/use-grid-editor";
import { getSettings, setWidgetsConfig, type AppSettings } from "@/services/settings";

export function WidgetsPage() {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  if (!settings) return null;
  return <WidgetsEditor initial={settings} />;
}

function WidgetsEditor({ initial }: { initial: AppSettings }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<WidgetsConfig>(() => ({
    enabled: initial.widgets.enabled,
    layout: reconcileLayout(initial.widgets.layout),
  }));
  const [addOpen, setAddOpen] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (next: WidgetsConfig) => setWidgetsConfig(next),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  const persist = useCallback(
    (next: WidgetsConfig) => {
      setConfig(next);
      mutation.mutate(next);
    },
    [mutation],
  );

  const editor = useGridEditor({
    layout: config.layout,
    onChange: (layout) => setConfig((c) => ({ ...c, layout })),
    onCommit: (layout) => persist({ ...config, layout }),
  });

  const setEnabled = (enabled: boolean) => persist({ ...config, enabled });

  const addWidget = (id: string) => {
    const def = getWidget(id);
    if (!def) return;
    const { w, h } = clampSize(resolveGridSize(def), def);
    persist({ ...config, layout: [...config.layout, { id, w, h }] });
    setAddOpen(false);
  };

  const removeWidget = (id: string) =>
    persist({ ...config, layout: config.layout.filter((e) => e.id !== id) });

  const setEntryConfig = (id: string, key: string, value: string | boolean) =>
    persist({
      ...config,
      layout: config.layout.map((e) =>
        e.id === id ? { ...e, config: { ...e.config, [key]: value } } : e,
      ),
    });

  const reset = () => persist({ enabled: true, layout: reconcileLayout([]) });

  const available = WIDGETS.filter((w) => !config.layout.some((e) => e.id === w.id));
  const configEntry = configId ? config.layout.find((e) => e.id === configId) : undefined;
  const configDef = configId ? getWidget(configId) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Show widgets</ItemTitle>
          <ItemDescription>
            Replace the launcher's idle screen with system info, clock, and more
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch checked={config.enabled} onCheckedChange={setEnabled} />
        </ItemActions>
      </Item>

      <div className="flex items-center justify-between mt-1">
        <h4 className="text-sm font-semibold tracking-tight">Board</h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" onClick={reset}>
            <RotateCcw />
            Reset
          </Button>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setAddOpen(true)}
            disabled={available.length === 0}
          >
            <Plus />
            Add widget
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground -mt-1">
        Drag to reorder, drag a tile's corner to resize, or use the gear to configure.
      </p>

      <div
        className={cn(
          "rounded-xl border border-border bg-red-300/30 overflow-hidden",
          !config.enabled && "opacity-40 pointer-events-none",
        )}
      >
        {config.layout.length === 0 ? (
          <div className="px-3 py-10 text-center text-xs text-muted-foreground">
            No widgets yet. Use “Add widget” to place one.
          </div>
        ) : (
          <div
            {...editor.gridProps}
            className="grid grid-flow-dense gap-2 p-2"
            style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
          >
            {config.layout.map((entry) => {
              const def = getWidget(entry.id);
              if (!def) return null;
              return (
                <EditorTile
                  key={entry.id}
                  entry={entry}
                  def={def}
                  dragging={editor.draggingId === entry.id}
                  resizing={editor.resizingId === entry.id}
                  onConfigure={() => setConfigId(entry.id)}
                  onRemove={() => removeWidget(entry.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <AddWidgetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        widgets={available}
        onAdd={addWidget}
      />

      <ConfigDialog
        open={configId !== null}
        onOpenChange={(open) => !open && setConfigId(null)}
        def={configDef}
        entry={configEntry}
        onChange={(key, value) => configId && setEntryConfig(configId, key, value)}
      />
    </div>
  );
}

interface EditorTileProps {
  entry: WidgetLayoutEntry;
  def: WidgetDefinition;
  dragging: boolean;
  resizing: boolean;
  onConfigure: () => void;
  onRemove: () => void;
}

function EditorTile({ entry, def, dragging, resizing, onConfigure, onRemove }: EditorTileProps) {
  const { w, h } = entrySize(def, entry);
  const Component = def.Component;
  return (
    <div
      data-widget-id={entry.id}
      draggable
      style={{
        gridColumn: `span ${w} / span ${w}`,
        gridRow: `span ${h} / span ${h}`,
        aspectRatio: `${w} / ${h}`,
      }}
      className={cn(
        "group relative cursor-grab rounded-3xl transition-[transform,box-shadow] duration-150 active:cursor-grabbing",
        dragging && "z-10 scale-105 shadow-2xl ring-2 ring-primary",
        resizing && "ring-2 ring-primary",
      )}
    >
      {/* Live widget; non-interactive so the gesture stays with the tile. */}
      <div className="pointer-events-none h-full select-none">
        <Component config={resolveConfig(def, entry)} />
      </div>

      {/* Controls revealed on hover. */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {(def.configSchema?.length ?? 0) > 0 && (
          <Button
            data-no-drag
            variant="secondary"
            size="icon-xs"
            onClick={onConfigure}
            aria-label={`Configure ${def.name}`}
          >
            <Settings />
          </Button>
        )}
        <Button
          data-no-drag
          variant="secondary"
          size="icon-xs"
          onClick={onRemove}
          aria-label={`Remove ${def.name}`}
        >
          <X />
        </Button>
      </div>

      {/* Resize handle (read by the delegated pointer handlers). */}
      <div
        data-resize
        data-widget-id={entry.id}
        data-no-drag
        aria-label={`Resize ${def.name}`}
        className="absolute right-1.5 bottom-1.5 size-4 cursor-nwse-resize rounded-sm bg-foreground/15 opacity-0 ring-1 ring-foreground/20 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}

function AddWidgetDialog({
  open,
  onOpenChange,
  widgets,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: WidgetDefinition[];
  onAdd: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a widget</DialogTitle>
          <DialogDescription>Pick a widget to place on the board.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          {widgets.length === 0 ? (
            <p className="text-xs text-muted-foreground">Every widget is already on the board.</p>
          ) : (
            widgets.map((def) => {
              const Icon = def.icon;
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => onAdd(def.id)}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3 text-left transition-colors hover:bg-accent"
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{def.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {def.description}
                    </div>
                  </div>
                  <Plus className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfigDialog({
  open,
  onOpenChange,
  def,
  entry,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  def?: WidgetDefinition;
  entry?: WidgetLayoutEntry;
  onChange: (key: string, value: string | boolean) => void;
}) {
  const config = def && entry ? resolveConfig(def, entry) : {};
  const schema = def?.configSchema ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{def ? `${def.name} options` : "Options"}</DialogTitle>
          <DialogDescription>
            {schema.length > 0 ? "Configure this widget." : "No options yet."}
          </DialogDescription>
        </DialogHeader>
        {schema.length > 0 && (
          <div className="flex flex-col gap-3">
            {schema.map((field) => (
              <ConfigFieldRow
                key={field.key}
                field={field}
                value={config[field.key]}
                onChange={(value) => onChange(field.key, value)}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfigFieldRow({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: string | number | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{field.label}</span>
      {field.type === "toggle" ? (
        <Switch checked={value === true} onCheckedChange={(v) => onChange(v)} />
      ) : (
        <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
