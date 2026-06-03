import { useLauncherStore } from "@/stores/launcher";
import { motion } from "motion/react";
import { useMemo } from "react";

export const FocusRing = () => {
  const selectedValue = useLauncherStore((s) => s.selectedValue);

  const a = useMemo(() => {
    const tar = document.querySelector(`[data-value='${selectedValue}']`);
    if (tar) {
      const { x, y, width, height } = tar.getBoundingClientRect();
      return { x, y, width, height };
    }
    return null;
  }, [selectedValue]);

  if (!a) return null;

  return (
    <motion.div
      className="ring ring-primary absolute top-0 left-0 rounded-md z-0"
      initial={{ x: 8, y: 67 }}
      animate={{
        x: a?.x ?? 8,
        y: a?.y ?? 67,
      }}
      style={{
        width: a.width,
        height: a.height,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    />
  );
};
