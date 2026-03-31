import { useState, useEffect, useCallback, useRef } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { searchItems, activateItem, hideWindow, type SearchResult } from "../services/search";
import { invoke } from "@tauri-apps/api/core";

function ResultIcon({ item }: { item: SearchResult }) {
  if (item.icon) {
    return <img className="size-8 object-contain rounded" src={item.icon} alt="" />;
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
      {item.title.charAt(0).toUpperCase()}
    </span>
  );
}

export function App() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    const items = await searchItems(q);
    setResults(items);
  }, []);

  useEffect(() => {
    doSearch("");
  }, [doSearch]);

  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      activateItem(id);
      setQuery("");
      doSearch("");
    },
    [doSearch]
  );

  const running = results.filter((r) => r.kind === "window");
  const apps = results.filter((r) => r.kind !== "window");

  return (
    <Command
      className="rounded-none! bg-transparent! text-foreground"
      shouldFilter={false}
      loop
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setQuery("");
          hideWindow();
        }
      }}
    >
      <CommandInput
        ref={inputRef}
        placeholder="Search apps, commands..."
        value={query}
        onValueChange={(v) => {
          setQuery(v);
          doSearch(v);
        }}
      />
      <CommandList className="max-h-none flex-1 scrollbar-thin">
        <CommandEmpty>No results found.</CommandEmpty>
        {running.length > 0 && (
          <CommandGroup heading="Running">
            {running.map((item) => (
              <CommandItem key={item.id} value={item.id} onSelect={handleSelect} className="[&>svg.ml-auto]:hidden">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ResultIcon item={item} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium leading-tight">
                      {item.title}
                    </span>
                    <span className="truncate text-xs leading-tight text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="ml-auto h-auto shrink-0 rounded-sm bg-emerald-500/15 px-1.5 py-0 text-[10px] font-medium text-emerald-400"
                  >
                    Running
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {apps.length > 0 && (
          <CommandGroup heading="Applications">
            {apps.map((item) => (
              <CommandItem key={item.id} value={item.id} onSelect={handleSelect} className="[&>svg.ml-auto]:hidden">
                <ResultIcon item={item} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium leading-tight">
                    {item.title}
                  </span>
                  <span className="truncate text-xs leading-tight text-muted-foreground">
                    {item.subtitle}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center justify-end border-t px-2 py-1">
        <Button
          variant="ghost"
          size="icon-xs"
          title="Settings"
          onClick={() => invoke("open_settings")}
        >
          <Settings className="size-3.5" />
        </Button>
      </div>
    </Command>
  );
}
