import { useCallback, useMemo, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { searchItems, activateItem } from "@/services/search";
import {
  getInstantAnswer,
  getAsyncInstantAnswer,
  getInstantAnswerHints,
} from "@/lib/instant-answer";
import { useLauncherStore, setQuery } from "@/stores/launcher";
import { InstantAnswerGroup } from "./InstantAnswerGroup";
import { HintGroup } from "./HintGroup";
import { ResultItem } from "./ResultItem";

export function ResultList({
  ref,
  onFillHint,
}: {
  ref?: RefObject<HTMLDivElement | null>;
  onFillHint: (example: string) => void;
}) {
  const query = useLauncherStore((s) => s.query);
  const tab = useLauncherStore((s) => s.tab);

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

  const handleSelect = useCallback((id: string) => {
    activateItem(id);
    setQuery("");
  }, []);

  const showInstantAnswers = tab === "all" && instantAnswers.length > 0;
  const showHints = tab === "all" && hints.length > 0 && !showInstantAnswers;

  return (
    <CommandList ref={ref} className="max-h-none flex-1 scrollbar-thin p-0!">
      {showInstantAnswers && <InstantAnswerGroup answers={instantAnswers} />}
      {showHints && <HintGroup hints={hints} onSelect={onFillHint} />}
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup>
        {results.map((item) => (
          <ResultItem key={item.id} item={item} onSelect={handleSelect} />
        ))}
      </CommandGroup>
    </CommandList>
  );
}
