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
import { Settings, Calculator, Copy, Check, Ruler, Calendar, Clock, Palette, DollarSign, Percent } from "lucide-react";
import { searchItems, activateItem, hideWindow, type SearchResult } from "../services/search";
import { invoke } from "@tauri-apps/api/core";
import { getInstantAnswer, getAsyncInstantAnswer, type InstantAnswer, type InstantAnswerType } from "@/lib/instant-answer";

const ANSWER_META: Record<InstantAnswerType, { heading: string; icon: React.ReactNode; iconBg: string }> = {
  calc:       { heading: "Calculator",  icon: <Calculator className="size-4" />,  iconBg: "bg-orange-500/15 text-orange-400" },
  percentage: { heading: "Percentage",  icon: <Percent className="size-4" />,     iconBg: "bg-orange-500/15 text-orange-400" },
  unit:       { heading: "Conversion",  icon: <Ruler className="size-4" />,       iconBg: "bg-blue-500/15 text-blue-400" },
  currency:   { heading: "Currency",    icon: <DollarSign className="size-4" />,  iconBg: "bg-green-500/15 text-green-400" },
  date:       { heading: "Date",        icon: <Calendar className="size-4" />,    iconBg: "bg-purple-500/15 text-purple-400" },
  timezone:   { heading: "Time Zone",   icon: <Clock className="size-4" />,       iconBg: "bg-purple-500/15 text-purple-400" },
  color:      { heading: "Color",       icon: <Palette className="size-4" />,     iconBg: "bg-pink-500/15 text-pink-400" },
};

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
    const onFocus = () => {
      setQuery("");
      setInstantAnswers([]);
      setCopiedIdx(null);
      doSearch("");
      inputRef.current?.focus();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [doSearch]);

  const handleSelect = useCallback(
    (id: string) => {
      activateItem(id);
      setQuery("");
      doSearch("");
    },
    [doSearch]
  );

  const [instantAnswers, setInstantAnswers] = useState<InstantAnswer[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    const sync = getInstantAnswer(query);
    if (sync) {
      setInstantAnswers(sync);
      return;
    }
    // Try async (currency)
    let cancelled = false;
    setInstantAnswers([]);
    getAsyncInstantAnswer(query).then((ans) => {
      if (!cancelled) setInstantAnswers(ans ?? []);
    });
    return () => { cancelled = true; };
  }, [query]);

  const copyResult = useCallback((idx: number) => {
    const answer = instantAnswers[idx];
    if (!answer) return;
    navigator.clipboard.writeText(answer.result.replace(/,/g, ""));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, [instantAnswers]);

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
        {instantAnswers.length > 0 && (
          <CommandGroup heading={ANSWER_META[instantAnswers[0].type].heading}>
            {instantAnswers.map((answer, idx) => (
              <CommandItem
                key={idx}
                value={`__instant_${idx}__`}
                onSelect={() => copyResult(idx)}
                className="[&>svg.ml-auto]:hidden"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {answer.color ? (
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10"
                      style={{ backgroundColor: answer.color.cssColor }}
                    />
                  ) : (
                    <span className={`flex size-8 items-center justify-center rounded-lg ${ANSWER_META[answer.type].iconBg}`}>
                      {ANSWER_META[answer.type].icon}
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium leading-tight">
                      {answer.color ? answer.result : `= ${answer.result}`}
                    </span>
                    <span className="truncate text-xs leading-tight text-muted-foreground">
                      {answer.label}
                    </span>
                  </div>
                  <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {copiedIdx === idx ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copiedIdx === idx ? "Copied" : "Copy"}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
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
