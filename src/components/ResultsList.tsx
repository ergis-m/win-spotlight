import { useEffect, useRef } from "react";
import { activateItem, type SearchResult } from "../services/search";

interface ResultsListProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onActivate: () => void;
}

function ResultIcon({ item }: { item: SearchResult }) {
  if (item.icon) {
    return <img className="result-icon-img" src={item.icon} alt="" />;
  }
  return (
    <span className="result-icon result-initial">
      {item.title.charAt(0).toUpperCase()}
    </span>
  );
}

export function ResultsList({ results, selectedIndex, onSelect, onActivate }: ResultsListProps) {
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleActivate = (index: number) => {
    const item = results[index];
    if (item) {
      activateItem(item.id);
      onActivate();
    }
  };

  // Listen for Enter key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        handleActivate(selectedIndex);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  if (results.length === 0) {
    return (
      <div className="results-list">
        <div className="results-empty">No results found</div>
      </div>
    );
  }

  return (
    <div className="results-list">
      {results.map((item, index) => (
        <div
          key={item.id}
          ref={index === selectedIndex ? selectedRef : undefined}
          className={`result-item${index === selectedIndex ? " selected" : ""}`}
          onClick={() => handleActivate(index)}
          onMouseEnter={() => onSelect(index)}
        >
          <div className="result-icon-wrap">
            <ResultIcon item={item} />
          </div>
          <div className="result-text">
            <span className="result-title">{item.title}</span>
            <span className="result-subtitle">{item.subtitle}</span>
          </div>
          {item.kind === "window" && (
            <span className="result-badge">Running</span>
          )}
        </div>
      ))}
    </div>
  );
}
