import { CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ResultIcon } from "./ResultIcon";
import type { SearchResult } from "@/services/search";

const BADGE_BY_KIND: Partial<Record<SearchResult["kind"], string>> = {
  window: "Running",
  tab: "Tab",
};

interface ResultItemProps {
  item: SearchResult;
  onSelect: (id: string) => void;
}

export function ResultItem({ item, onSelect }: ResultItemProps) {
  const badge = BADGE_BY_KIND[item.kind];
  return (
    <CommandItem
      key={item.id}
      value={item.id}
      onSelect={onSelect}
      className="[&>svg.ml-auto]:hidden"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ResultIcon item={item} />
        <div className="min-w-0 flex-1 gap-2 flex-row flex items-start">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
          <span className="text-xs text-foreground/50 font-light">{item.subtitle}</span>
        </div>
        {badge && (
          <Badge
            variant="secondary"
            className="ml-auto h-auto shrink-0 rounded-sm bg-success/15 px-1.5 py-0 text-[10px] font-medium text-success"
          >
            {badge}
          </Badge>
        )}
      </div>
    </CommandItem>
  );
}
