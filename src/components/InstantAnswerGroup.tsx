import { useState, useCallback } from "react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { Calculator, Copy, Check, Ruler, Calendar, Clock, Palette, DollarSign, Percent } from "lucide-react";
import type { InstantAnswer, InstantAnswerType } from "@/lib/instant-answer";

const ANSWER_META: Record<InstantAnswerType, { heading: string; icon: React.ReactNode; iconBg: string }> = {
  calc:       { heading: "Calculator",  icon: <Calculator className="size-4" />,  iconBg: "bg-orange-500/15 text-orange-400" },
  percentage: { heading: "Percentage",  icon: <Percent className="size-4" />,     iconBg: "bg-orange-500/15 text-orange-400" },
  unit:       { heading: "Conversion",  icon: <Ruler className="size-4" />,       iconBg: "bg-blue-500/15 text-blue-400" },
  currency:   { heading: "Currency",    icon: <DollarSign className="size-4" />,  iconBg: "bg-green-500/15 text-green-400" },
  date:       { heading: "Date",        icon: <Calendar className="size-4" />,    iconBg: "bg-purple-500/15 text-purple-400" },
  timezone:   { heading: "Time Zone",   icon: <Clock className="size-4" />,       iconBg: "bg-purple-500/15 text-purple-400" },
  color:      { heading: "Color",       icon: <Palette className="size-4" />,     iconBg: "bg-pink-500/15 text-pink-400" },
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
              <span className={`flex size-8 items-center justify-center rounded-lg ${ANSWER_META[answer.type].iconBg}`}>
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
              {copiedIdx === idx ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copiedIdx === idx ? "Copied" : "Copy"}
            </span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
