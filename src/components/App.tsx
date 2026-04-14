import { useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { searchItems, activateItem, hideWindow } from "@/services/search";
import {
  getInstantAnswer,
  getAsyncInstantAnswer,
  getInstantAnswerHints,
} from "@/lib/instant-answer";
import { loadAndApplySettings } from "@/lib/theme";
import { invoke } from "@tauri-apps/api/core";
import { InstantAnswerGroup } from "./InstantAnswerGroup";
import { HintGroup } from "./HintGroup";
import { ResultItem } from "./ResultItem";
import { SearchFooter } from "./SearchFooter";
import {
  useLauncherStore,
  TABS,
  setQuery,
  setTab,
  cycleTab,
  setSelectedValue,
  resetLauncher,
} from "@/stores/launcher";

export function App() {
  const query = useLauncherStore((s) => s.query);
  const tab = useLauncherStore((s) => s.tab);
  const selectedValue = useLauncherStore((s) => s.selectedValue);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
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

  const { data: pinned = false } = useQuery({
    queryKey: ["pinned"],
    queryFn: () => invoke<boolean>("is_pinned"),
  });

  const hints = useMemo(
    () => (instantAnswers.length === 0 ? getInstantAnswerHints(query) : []),
    [query, instantAnswers.length],
  );

  const placeholder = useMemo(() => TABS.find((t) => t.key === tab)?.placeholder, [tab]);

  const fillHint = useCallback((example: string) => {
    setQuery(example);
    inputRef.current?.focus();
  }, []);

  const handleWindowFocus = useCallback(() => {
    resetLauncher();
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

  const showInstantAnswers = tab === "all" && instantAnswers.length > 0;
  const showHints = tab === "all" && hints.length > 0 && !showInstantAnswers;

  return (
    <div className="relative flex size-full flex-col">
      {pinned && (
        <div
          data-tauri-drag-region
          className="relative flex h-4 cursor-grab items-center justify-center bg-background/20 hover:bg-background/30"
        >
          <div data-tauri-drag-region className="h-0.5 w-8 rounded-full bg-muted-foreground/40" />
        </div>
      )}
      <Command
        ref={commandRef}
        className="rounded-none! bg-background/20 text-foreground p-1"
        shouldFilter={false}
        loop
        value={selectedValue}
        onValueChange={setSelectedValue}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            resetLauncher();
            hideWindow();
          }
          if (e.key === "Tab") {
            e.preventDefault();
            cycleTab(e.shiftKey);
          }
        }}
      >
        <CommandInput
          ref={inputRef}
          placeholder={placeholder}
          className="text-xs"
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            listRef.current?.scrollTo(0, 0);
          }}
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
        <CommandList ref={listRef} className="max-h-none flex-1 scrollbar-thin p-0!">
          {showInstantAnswers && <InstantAnswerGroup answers={instantAnswers} />}
          {showHints && <HintGroup hints={hints} onSelect={fillHint} />}
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {results.map((item) => (
              <ResultItem key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </CommandGroup>
        </CommandList>
        <SearchFooter />
      </Command>
    </div>
  );
}
