import { useState, useCallback } from "react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalculatorIcon,
  CopyIcon,
  Tick02Icon,
  RulerIcon,
  Calendar01Icon,
  Clock01Icon,
  PaintBoardIcon,
  Dollar01Icon,
  PercentIcon,
} from "@hugeicons/core-free-icons";
import type { InstantAnswer, InstantAnswerType } from "@/lib/instant-answer";
import { ANSWER_ACCENT } from "@/lib/answer-accents";

const ANSWER_META: Record<InstantAnswerType, { heading: string; icon: React.ReactNode }> = {
  calc: {
    heading: "Calculator",
    icon: <HugeiconsIcon icon={CalculatorIcon} strokeWidth={2} className="size-4" />,
  },
  percentage: {
    heading: "Percentage",
    icon: <HugeiconsIcon icon={PercentIcon} strokeWidth={2} className="size-4" />,
  },
  unit: {
    heading: "Conversion",
    icon: <HugeiconsIcon icon={RulerIcon} strokeWidth={2} className="size-4" />,
  },
  currency: {
    heading: "Currency",
    icon: <HugeiconsIcon icon={Dollar01Icon} strokeWidth={2} className="size-4" />,
  },
  date: {
    heading: "Date",
    icon: <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4" />,
  },
  timezone: {
    heading: "Time Zone",
    icon: <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4" />,
  },
  color: {
    heading: "Color",
    icon: <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={2} className="size-4" />,
  },
};

interface InstantAnswerGroupProps {
  answers: InstantAnswer[];
}

export function InstantAnswerGroup({ answers }: InstantAnswerGroupProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyResult = useCallback(
    (idx: number) => {
      const answer = answers[idx];
      if (!answer) return;
      navigator.clipboard.writeText(answer.result.replace(/,/g, ""));
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    },
    [answers],
  );

  if (answers.length === 0) return null;

  return (
    <CommandGroup heading={ANSWER_META[answers[0].type].heading}>
      {answers.map((answer, idx) => (
        <CommandItem
          key={idx}
          value={`__instant_${idx}__`}
          onSelect={() => copyResult(idx)}
          className="[&>svg.ml-auto]:hidden"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {answer.color ? (
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10"
                style={{ backgroundColor: answer.color.cssColor }}
              />
            ) : (
              <span
                className={`flex size-8 items-center justify-center rounded-lg ${ANSWER_ACCENT[answer.type]}`}
              >
                {ANSWER_META[answer.type].icon}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium leading-tight">
                {answer.color ? answer.result : `= ${answer.result}`}
              </span>
              <span className="truncate text-xs leading-tight text-muted-foreground">
                {answer.label}
              </span>
            </div>
            <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {copiedIdx === idx ? (
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3" />
              ) : (
                <HugeiconsIcon icon={CopyIcon} strokeWidth={2} className="size-3" />
              )}
              {copiedIdx === idx ? "Copied" : "Copy"}
            </span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
