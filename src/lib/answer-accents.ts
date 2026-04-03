import type { InstantAnswerType } from "./instant-answer";

/**
 * Maps each instant-answer type to a semantic color token
 * so icon backgrounds stay consistent with the design system.
 */
export const ANSWER_ACCENT: Record<InstantAnswerType, string> = {
  calc: "bg-warning/15 text-warning",
  percentage: "bg-warning/15 text-warning",
  unit: "bg-info/15 text-info",
  currency: "bg-success/15 text-success",
  date: "bg-primary/15 text-primary",
  timezone: "bg-primary/15 text-primary",
  color: "bg-destructive/15 text-destructive",
  devtools: "bg-violet-500/15 text-violet-400",
};
