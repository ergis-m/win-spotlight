import { useCallback } from "react";
import { use$ } from "@legendapp/state/react";
import { syncState } from "@legendapp/state";
import { CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { activateItem } from "@/services/search";
import { launcher$, setQuery } from "@/stores/launcher";
import { searchResults$, instantAnswers$, hints$ } from "@/stores/search";
import { setListElement, focusInput } from "@/lib/launcher-lifecycle";
import { InstantAnswerGroup } from "./InstantAnswerGroup";
import { HintGroup } from "./HintGroup";
import { ResultItem } from "./ResultItem";

export function ResultList() {
  const query = use$(launcher$.query);
  const tab = use$(launcher$.tab);
  const results = use$(searchResults$);
  const instantAnswers = use$(instantAnswers$);
  const hints = use$(hints$);
  const isSearching = use$(() => syncState(searchResults$).isGetting.get() ?? false);

  const handleSelect = useCallback((id: string) => {
    activateItem(id);
    setQuery("");
  }, []);

  const handleFillHint = useCallback((example: string) => {
    setQuery(example);
    focusInput();
  }, []);

  const showInstantAnswers = tab === "apps" && instantAnswers.length > 0;
  const showHints = tab === "apps" && hints.length > 0 && !showInstantAnswers;
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
