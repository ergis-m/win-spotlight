import type { PropsWithChildren } from "react";

export const LauncherWrapper = (props: PropsWithChildren) => {
  return (
    <div className="relative flex size-full flex-col">
      <div className="isolate absolute inset-0">
        <div className="meshy absolute inset-0" />
        <div className="noise absolute inset-0" />
      </div>
      {props.children}
    </div>
  );
};
