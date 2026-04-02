import { CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Calculator,
  Ruler,
  Calendar,
  Clock,
  Palette,
  DollarSign,
  Percent,
  Lightbulb,
} from "lucide-react";
import type { InstantAnswerHint, InstantAnswerType } from "@/lib/instant-answer";

const HINT_ICON: Record<InstantAnswerType, { icon: React.ReactNode; iconBg: string }> = {
  calc:       { icon: <Calculator className="size-4" />, iconBg: "bg-orange-500/15 text-orange-400" },
  percentage: { icon: <Percent className="size-4" />,    iconBg: "bg-orange-500/15 text-orange-400" },
  unit:       { icon: <Ruler className="size-4" />,      iconBg: "bg-blue-500/15 text-blue-400" },
  currency:   { icon: <DollarSign className="size-4" />, iconBg: "bg-green-500/15 text-green-400" },
  date:       { icon: <Calendar className="size-4" />,   iconBg: "bg-purple-500/15 text-purple-400" },
  timezone:   { icon: <Clock className="size-4" />,      iconBg: "bg-purple-500/15 text-purple-400" },
  color:      { icon: <Palette className="size-4" />,    iconBg: "bg-pink-500/15 text-pink-400" },
};

interface HintGroupProps {
  hints: InstantAnswerHint[];
  onSelect: (example: string) => void;
}

export function HintGroup({ hints, onSelect }: HintGroupProps) {
  if (hints.length === 0) return null;

  return (
    <CommandGroup heading="Try">
      {hints.map((hint, idx) => (
        <CommandItem
          key={idx}
          value={`__hint_${idx}__`}
          onSelect={() => onSelect(hint.example)}
          className="[&>svg.ml-auto]:hidden"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className={`flex size-8 items-center justify-center rounded-lg ${HINT_ICON[hint.type].iconBg}`}>
              {HINT_ICON[hint.type].icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium leading-tight text-foreground/80">
                {hint.example}
              </span>
              <span className="truncate text-xs leading-tight text-muted-foreground">
                {hint.description}
              </span>
            </div>
            <Lightbulb className="ml-auto size-3 shrink-0 text-muted-foreground/50" />
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
