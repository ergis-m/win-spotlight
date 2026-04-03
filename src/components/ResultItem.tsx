import { CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ResultIcon } from "./ResultIcon";
import type { SearchResult } from "@/services/search";

interface ResultItemProps {
  item: SearchResult;
  onSelect: (id: string) => void;
  showBadge?: string;
}

export function ResultItem({ item, onSelect, showBadge }: ResultItemProps) {
  return (
    <CommandItem
      key={item.id}
      value={item.id}
      onSelect={onSelect}
      className="[&>svg.ml-auto]:hidden"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ResultIcon item={item} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium leading-tight">{item.title}</span>
          <span className="truncate text-xs leading-tight text-muted-foreground">
            {item.subtitle}
          </span>
        </div>
        {showBadge && (
          <Badge
            variant="secondary"
            className="ml-auto h-auto shrink-0 rounded-sm bg-success/15 px-1.5 py-0 text-[10px] font-medium text-success"
          >
            {showBadge}
          </Badge>
        )}
      </div>
    </CommandItem>
  );
}
