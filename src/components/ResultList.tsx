import { useCallback, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { searchItems, activateItem } from "@/services/search";
import {
  getInstantAnswer,
  getAsyncInstantAnswer,
  getInstantAnswerHints,
} from "@/lib/instant-answer";
import { useLauncherStore, setQuery } from "@/stores/launcher";
import { setListElement, focusInput } from "@/lib/launcher-lifecycle";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";
import { InstantAnswerGroup } from "./InstantAnswerGroup";
import { HintGroup } from "./HintGroup";
import { ResultItem } from "./ResultItem";

export function ResultList() {
  const query = useLauncherStore((s) => s.query);
  const tab = useLauncherStore((s) => s.tab);

  const {
    data: results = [],
    isFetching: isSearching,
    refetch,
  } = useQuery({
    queryKey: ["search", query, tab],
    queryFn: () => searchItems(query, tab),
    placeholderData: keepPreviousData,
  });

  useRefreshOnFocus(refetch);

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

  const handleFillHint = useCallback((example: string) => {
    setQuery(example);
    focusInput();
  }, []);

  const showInstantAnswers = tab === "all" && instantAnswers.length > 0;
  const showHints = tab === "all" && hints.length > 0 && !showInstantAnswers;
  const showEmpty =
    query.trim().length > 0 &&
    !isSearching &&
    results.length === 0 &&
    instantAnswers.length === 0 &&
    hints.length === 0;

  return (
    <CommandList ref={setListElement} className="max-h-none flex-1 scrollbar-thin p-0! mt-1">
      {showInstantAnswers && <InstantAnswerGroup answers={instantAnswers} />}
      {showHints && <HintGroup hints={hints} onSelect={handleFillHint} />}
      {showEmpty && <CommandEmpty>No results found.</CommandEmpty>}
      <CommandGroup>
        {results.map((item) => (
          <ResultItem key={item.id} item={item} onSelect={handleSelect} />
        ))}
      </CommandGroup>
    </CommandList>
  );
}
