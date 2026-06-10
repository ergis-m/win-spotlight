import { useCallback } from "react";
import { use$ } from "@legendapp/state/react";
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
  // Deliberately ignores whether a search is in flight: previous results are
  // kept during a refetch, so this only flips when a search truly came back
  // empty — unmounting on every keystroke made the empty state (and the
  // footer below it) flicker. The brief first-search gap where results are
  // still [] is hidden by the empty state's delayed fade-in (global.css).
  const showEmpty =
    query.trim().length > 0 &&
    results.length === 0 &&
    instantAnswers.length === 0 &&
    hints.length === 0;

  return (
    <CommandList ref={setListElement} className="max-h-none min-h-0 scrollbar-thin px-1 mt-1">
      {showInstantAnswers && <InstantAnswerGroup answers={instantAnswers} />}
      {showHints && <HintGroup hints={hints} onSelect={handleFillHint} />}
      {showEmpty && <CommandEmpty>No results found.</CommandEmpty>}
      {results.length > 0 && (
        <CommandGroup>
          {results.map((item) => (
            <ResultItem key={item.id} item={item} onSelect={handleSelect} />
          ))}
        </CommandGroup>
      )}
    </CommandList>
  );
}
