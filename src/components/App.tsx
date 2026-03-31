import { useState, useEffect, useCallback, useRef } from "react";
import { SearchBar } from "./SearchBar";
import { ResultsList } from "./ResultsList";
import { FooterBar } from "./FooterBar";
import { searchItems, hideWindow, type SearchResult } from "../services/search";

export function App() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    const items = await searchItems(q);
    setResults(items);
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    doSearch("");
  }, [doSearch]);

  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const clearAndReset = useCallback(() => {
    setQuery("");
    doSearch("");
  }, [doSearch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          setQuery("");
          hideWindow();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (results.length ? (i + 1) % results.length : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
          break;
        case "Enter":
          e.preventDefault();
          // Handled by ResultsList via activateSelected
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [results.length]);

  return (
    <div className="launcher">
      <SearchBar
        ref={inputRef}
        value={query}
        onChange={(q) => {
          setQuery(q);
          doSearch(q);
        }}
      />
      <ResultsList
        results={results}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onActivate={clearAndReset}
      />
      <FooterBar />
    </div>
  );
}
