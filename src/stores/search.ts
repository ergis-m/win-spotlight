import { observable, observe } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { searchItems, type SearchResult } from "@/services/search";
import {
  getInstantAnswer,
  getInstantAnswerHints,
  getAsyncInstantAnswer,
  type InstantAnswer,
  type InstantAnswerHint,
} from "@/lib/instant-answer";
import { launcher$ } from "@/stores/launcher";
import { onFocus } from "@/lib/sync-helpers";

/**
 * Results for the current (debounced) query + tab. Reading `launcher$` inside
 * `get` makes it re-run whenever the query or tab changes, and the observable
 * keeps the previous results while a new search is in flight (so there's no
 * blank flash — what `keepPreviousData` did before).
 */
export const searchResults$ = observable(
  synced<SearchResult[]>({
    get: () => searchItems(launcher$.query.get(), launcher$.tab.get()),
    subscribe: ({ refresh }) => onFocus(refresh),
    initial: [],
  }),
);

/**
 * Async instant answers (e.g. currency conversion) for queries that have no
 * synchronous answer. Short-circuits to `[]` when a sync answer already exists
 * or the query is blank — the equivalent of the old `enabled` guard.
 */
export const asyncInstantAnswers$ = observable(
  synced<InstantAnswer[]>({
    get: () => {
      const q = launcher$.query.get();
      if (getInstantAnswer(q) || q.trim().length === 0) return [];
      return getAsyncInstantAnswer(q).then((answers) => answers ?? []);
    },
    initial: [],
  }),
);

/** Instant answers to show: synchronous match first, async (currency) as fallback. */
export const instantAnswers$ = observable<InstantAnswer[]>(
  () => getInstantAnswer(launcher$.query.get()) ?? asyncInstantAnswers$.get(),
);

/** Discovery hints, shown only while there's no instant answer for the query. */
export const hints$ = observable<InstantAnswerHint[]>(() =>
  instantAnswers$.get().length === 0 ? getInstantAnswerHints(launcher$.query.get()) : [],
);

/** Id of the first selectable row, in display order (instant answers, then hints, then results). */
export const firstItemId$ = observable<string>(() => {
  if (instantAnswers$.get().length > 0) return "__instant_0__";
  if (hints$.get().length > 0) return "__hint_0__";
  return searchResults$.get()[0]?.id ?? "";
});

/** Every id that can currently be selected — used to detect a dangling selection. */
export const validIds$ = observable<Set<string>>(() => {
  const ids = new Set<string>();
  instantAnswers$.get().forEach((_, i) => ids.add(`__instant_${i}__`));
  hints$.get().forEach((_, i) => ids.add(`__hint_${i}__`));
  searchResults$.get().forEach((r) => ids.add(r.id));
  return ids;
});

/**
 * Keep the highlight on the first row as results change, without fighting the
 * user's arrow-key navigation. Reacts to the first id / valid-id set changing
 * and reads the current selection with `peek()`, so moving the selection itself
 * never re-triggers this — and setting an observable here needs no microtask
 * hop the way a React render-phase update did.
 */
let prevFirstId = "";
observe(() => {
  const firstId = firstItemId$.get();
  const validIds = validIds$.get();
  const selected = launcher$.selectedValue.peek();

  if (prevFirstId !== firstId) {
    const wasOnPrevFirst = selected === prevFirstId;
    prevFirstId = firstId;
    const isDangling = selected !== "" && !validIds.has(selected);
    if (firstId && (wasOnPrevFirst || isDangling || selected === "")) {
      launcher$.selectedValue.set(firstId);
    }
  } else if (firstId && selected !== "" && !validIds.has(selected)) {
    launcher$.selectedValue.set(firstId);
  }
});
