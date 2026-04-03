import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isOnboardingCompleted, completeOnboarding } from "@/services/settings";
import { Kbd } from "@/components/ui/kbd";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  Search01Icon,
  ZapIcon,
  FolderOpenIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

const STEPS: {
  icon: IconSvgElement;
  title: string;
  description: string;
  keys?: React.ReactNode;
  examples?: string[];
}[] = [
  {
    icon: Search01Icon,
    title: "Quick Launch",
    description:
      "Press Alt+Space anywhere to open the launcher. Type to search apps, files, and more.",
    keys: (
      <span className="flex items-center gap-1">
        <Kbd>Alt</Kbd>
        <span className="text-muted-foreground">+</span>
        <Kbd>Space</Kbd>
      </span>
    ),
  },
  {
    icon: ZapIcon,
    title: "Instant Answers",
    description:
      "Type math expressions, unit conversions, color codes, or currency conversions to get instant results.",
    examples: ["2+2*3", "5km in miles", "#ff5733", "100 USD to EUR"],
  },
  {
    icon: FolderOpenIcon,
    title: "Navigate Fast",
    description:
      "Use Tab to switch between All, Apps, Files, and Media. Arrow keys to navigate, Enter to open.",
    keys: (
      <span className="flex items-center gap-2">
        <span className="flex items-center gap-1">
          <Kbd>Tab</Kbd>
          <span className="text-[11px] text-muted-foreground">switch</span>
        </span>
        <span className="flex items-center gap-1">
          <Kbd className="px-1.5">↑</Kbd>
          <Kbd className="px-1.5">↓</Kbd>
          <span className="text-[11px] text-muted-foreground">navigate</span>
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd>
          <span className="text-[11px] text-muted-foreground">open</span>
        </span>
      </span>
    ),
  },
];

// Each step shifts the blob positions for a living feel
const MESH_CONFIGS = [
  [
    { x: "15%", y: "20%", color: "rgba(99, 102, 241, 0.18)" },
    { x: "75%", y: "15%", color: "rgba(139, 92, 246, 0.14)" },
    { x: "50%", y: "70%", color: "rgba(59, 130, 246, 0.16)" },
    { x: "85%", y: "75%", color: "rgba(168, 85, 247, 0.12)" },
  ],
  [
    { x: "25%", y: "30%", color: "rgba(139, 92, 246, 0.16)" },
    { x: "70%", y: "25%", color: "rgba(59, 130, 246, 0.18)" },
    { x: "40%", y: "75%", color: "rgba(168, 85, 247, 0.14)" },
    { x: "80%", y: "60%", color: "rgba(99, 102, 241, 0.12)" },
  ],
  [
    { x: "20%", y: "25%", color: "rgba(59, 130, 246, 0.14)" },
    { x: "65%", y: "20%", color: "rgba(168, 85, 247, 0.16)" },
    { x: "35%", y: "65%", color: "rgba(99, 102, 241, 0.18)" },
    { x: "80%", y: "70%", color: "rgba(139, 92, 246, 0.14)" },
  ],
];

function MeshGradient({ step }: { step: number }) {
  const blobs = MESH_CONFIGS[step];

  return (
    <div className="pointer-events-none absolute inset-0">
      {blobs.map((blob, i) => (
        <div
          key={i}
          className="absolute size-[280px] rounded-full blur-[100px]"
          style={{
            left: blob.x,
            top: blob.y,
            background: blob.color,
            transform: "translate(-50%, -50%)",
            transition:
              "left 0.8s cubic-bezier(0.22, 1, 0.36, 1), top 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      ))}
    </div>
  );
}

export function Onboarding({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const { data: completed, isLoading } = useQuery({
    queryKey: ["onboarding"],
    queryFn: isOnboardingCompleted,
    staleTime: Infinity,
  });

  const { mutate: finish } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => queryClient.setQueryData(["onboarding"], true),
  });

  if (isLoading || completed) return children;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="relative flex size-full flex-col bg-background/20">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <MeshGradient step={step} />
      </div>

      {/* Top: step indicators */}
      <div className="relative z-10 flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        {STEPS.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-colors ${
              i === step
                ? "bg-primary/15 font-medium text-foreground"
                : i < step
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground/50"
            }`}
            onClick={() => setStep(i)}
          >
            <div
              className={`flex size-5 items-center justify-center rounded-md text-[10px] font-semibold ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-muted-foreground/20 text-muted-foreground"
                    : "bg-muted-foreground/10 text-muted-foreground/50"
              }`}
            >
              {i + 1}
            </div>
            {s.title}
          </button>
        ))}
      </div>

      {/* Middle: step content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/25">
          <HugeiconsIcon
            icon={current.icon}
            strokeWidth={2}
            className="size-6 text-primary-foreground"
          />
        </div>

        <h2 className="mb-1.5 text-base font-semibold text-foreground">{current.title}</h2>
        <p className="mb-4 max-w-[340px] text-[13px] leading-relaxed text-muted-foreground">
          {current.description}
        </p>

        {current.keys && <div className="mb-2">{current.keys}</div>}

        {current.examples && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {current.examples.map((ex) => (
              <span
                key={ex}
                className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {ex}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: navigation */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
        <button
          type="button"
          className="text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          onClick={() => finish()}
        >
          Skip intro
        </button>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => {
              if (isLast) {
                finish();
              } else {
                setStep((s) => s + 1);
              }
            }}
          >
            {isLast ? "Get Started" : "Next"}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
