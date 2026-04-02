import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import {
  searchItems,
  activateItem,
  hideWindow,
  type SearchMode,
} from "@/services/search";
import { getInstantAnswer, getAsyncInstantAnswer, getInstantAnswerHints } from "@/lib/instant-answer";
import { loadAndApplySettings } from "@/lib/theme";
import { InstantAnswerGroup } from "./InstantAnswerGroup";
import { HintGroup } from "./HintGroup";
import { ResultItem } from "./ResultItem";
import { SearchFooter } from "./SearchFooter";
import { Button } from "./ui/button";

const TABS: { key: SearchMode; label: string }[] = [
  { key: "all", label: "All" },
  { key: "apps", label: "Apps" },
  { key: "files", label: "Files" },
  { key: "media", label: "Media" },
];

export function App() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchMode>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: results = [] } = useQuery({
    queryKey: ["search", query, tab],
    queryFn: () => searchItems(query, tab),
  });

  const syncAnswers = useMemo(() => getInstantAnswer(query), [query]);

  const { data: asyncAnswers } = useQuery({
    queryKey: ["instant-answer-async", query],
    queryFn: () => getAsyncInstantAnswer(query),
    enabled: !syncAnswers && query.trim().length > 0,
  });

  const instantAnswers = syncAnswers ?? asyncAnswers ?? [];

  const hints = useMemo(
    () => (instantAnswers.length === 0 ? getInstantAnswerHints(query) : []),
    [query, instantAnswers.length],
  );

  const fillHint = useCallback((example: string) => {
    setQuery(example);
    inputRef.current?.focus();
  }, []);

  const handleWindowFocus = useCallback(() => {
    setQuery("");
    setTab("all");
    queryClient.invalidateQueries({ queryKey: ["search"] });
    inputRef.current?.focus();
    loadAndApplySettings();
  }, [queryClient]);

  const focusListenerRef = useRef<(() => void) | null>(null);
  const commandRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (focusListenerRef.current) {
        window.removeEventListener("focus", focusListenerRef.current);
        focusListenerRef.current = null;
      }
      if (node) {
        focusListenerRef.current = handleWindowFocus;
        window.addEventListener("focus", handleWindowFocus);
      }
    },
    [handleWindowFocus],
  );

  const handleSelect = useCallback((id: string) => {
    activateItem(id);
    setQuery("");
  }, []);

  const running = results.filter((r) => r.kind === "window");
  const files = results.filter((r) => r.kind === "file");
  const apps = results.filter((r) => r.kind !== "window" && r.kind !== "file");

  const showInstantAnswers = tab === "all" && instantAnswers.length > 0;
  const showHints = tab === "all" && hints.length > 0 && !showInstantAnswers;
  const showGrouped = tab === "all" || tab === "apps";

  return (
    <Command
      ref={commandRef}
      className="rounded-none! bg-background/20 text-foreground p-1"
      shouldFilter={false}
      loop
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setQuery("");
          setTab("all");
          hideWindow();
        }
        if (e.key === "Tab") {
          e.preventDefault();
          setTab((prev) => {
            const idx = TABS.findIndex((t) => t.key === prev);
            const next = e.shiftKey
              ? (idx - 1 + TABS.length) % TABS.length
              : (idx + 1) % TABS.length;
            return TABS[next].key;
          });
        }
      }}
    >
      <CommandInput
        ref={inputRef}
        placeholder={
          tab === "all"
            ? "Search apps, files..."
            : tab === "apps"
              ? "Search apps..."
              : tab === "files"
                ? "Search files..."
                : "Search media..."
        }
        className="text-xs"
        value={query}
        onValueChange={setQuery}
      >
        <div className="flex items-center gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                tab === t.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setTab(t.key);
                inputRef.current?.focus();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CommandInput>
      <CommandList className="max-h-none flex-1 scrollbar-thin p-0!">
        {showInstantAnswers && <InstantAnswerGroup answers={instantAnswers} />}
        {showHints && <HintGroup hints={hints} onSelect={fillHint} />}
        <CommandEmpty>No results found.</CommandEmpty>
        {showGrouped ? (
          <>
            {running.length > 0 && (
              <CommandGroup heading="Running">
                {running.map((item) => (
                  <ResultItem
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                    showBadge="Running"
                  />
                ))}
              </CommandGroup>
            )}
            {apps.length > 0 && (
              <CommandGroup heading="Applications">
                {apps.map((item) => (
                  <ResultItem key={item.id} item={item} onSelect={handleSelect} />
                ))}
              </CommandGroup>
            )}
            {files.length > 0 && (
              <CommandGroup heading="Files">
                {files.map((item) => (
                  <ResultItem key={item.id} item={item} onSelect={handleSelect} />
                ))}
              </CommandGroup>
            )}
          </>
        ) : (
          <CommandGroup>
            {results.map((item) => (
              <ResultItem key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <SearchFooter />
    </Command>
  );
}
