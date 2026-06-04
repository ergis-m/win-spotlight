import { use$ } from "@legendapp/state/react";
import { launcher$ } from "@/stores/launcher";
import { motion } from "motion/react";
import { useMemo } from "react";

const getElemetRect = (selector: string) => {
  const element = document.querySelector(selector);
  if (element) {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  }
  return null;
};

export const FocusRing = () => {
  const selectedValue = use$(launcher$.selectedValue);

  const defaultPos = getElemetRect('[data-slot="command-input-wrapper"]');

  const a = useMemo(() => {
    return getElemetRect(`[data-value='${selectedValue}']`);
  }, [selectedValue]);

  return (
    <motion.div
      layout
      layoutId="focus-ring"
      className="ring ring-primary absolute top-0 left-0 rounded-md z-0"
      animate={a ? { ...a, opacity: 1 } : { ...defaultPos, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    />
  );
};
