import { CommandGroup, CommandItem } from "@/components/ui/command";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalculatorIcon,
  RulerIcon,
  Calendar01Icon,
  Clock01Icon,
  PaintBoardIcon,
  Dollar01Icon,
  PercentIcon,
  BulbIcon,
} from "@hugeicons/core-free-icons";
import type { InstantAnswerHint, InstantAnswerType } from "@/lib/instant-answer";
import { ANSWER_ACCENT } from "@/lib/answer-accents";

const HINT_ICON: Record<InstantAnswerType, React.ReactNode> = {
  calc: <HugeiconsIcon icon={CalculatorIcon} strokeWidth={2} className="size-4" />,
  percentage: <HugeiconsIcon icon={PercentIcon} strokeWidth={2} className="size-4" />,
  unit: <HugeiconsIcon icon={RulerIcon} strokeWidth={2} className="size-4" />,
  currency: <HugeiconsIcon icon={Dollar01Icon} strokeWidth={2} className="size-4" />,
  date: <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4" />,
  timezone: <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4" />,
  color: <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={2} className="size-4" />,
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
            <span
              className={`flex size-8 items-center justify-center rounded-lg ${ANSWER_ACCENT[hint.type]}`}
            >
              {HINT_ICON[hint.type]}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium leading-tight text-foreground/80">
                {hint.example}
              </span>
              <span className="truncate text-xs leading-tight text-muted-foreground">
                {hint.description}
              </span>
            </div>
            <HugeiconsIcon
              icon={BulbIcon}
              strokeWidth={2}
              className="ml-auto size-3 shrink-0 text-muted-foreground/50"
            />
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
