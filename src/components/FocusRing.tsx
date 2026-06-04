import { use$ } from "@legendapp/state/react";
import { motion } from "motion/react";
import { launcher$ } from "@/stores/launcher";

interface FocusRingProps {
  value: string;
}

export const FocusRing = ({ value }: FocusRingProps) => {
  const isSelected = use$(() => launcher$.selectedValue.get() === value);
  if (!isSelected) return null;

  return (
    <motion.div
      layoutId="focus-ring"
      className="ring-primary pointer-events-none absolute inset-0 z-10 rounded-md ring-2"
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    />
  );
};
