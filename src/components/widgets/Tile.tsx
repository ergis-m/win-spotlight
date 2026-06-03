/* eslint-disable react/no-multi-comp */
import type { ComponentProps } from "react";
import { Slot } from "radix-ui";
import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

function Tile({ asChild, className, ...props }: ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      className={cn(
        "relative size-full overflow-hidden rounded-md p-3.5",
        "bg-linear-to-br from-background to-primary/30",
        className,
      )}
      {...props}
    />
  );
}

function TileIcon({ icon: Icon, className, ...props }: { icon: LucideIcon } & LucideProps) {
  return <Icon className={cn("size-7 shrink-0 text-muted-foreground", className)} {...props} />;
}

function TileLabel({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "max-w-full truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export default Object.assign(Tile, { Icon: TileIcon, Label: TileLabel });
