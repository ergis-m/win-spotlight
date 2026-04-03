import { useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  Settings01Icon,
  GlobeIcon,
  PaintBoardIcon,
  HardDriveIcon,
  MinusSignIcon,
  SquareIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { GeneralPage } from "./settings/GeneralPage";
import { AppearancePage } from "./settings/AppearancePage";
import { IndexingPage } from "./settings/IndexingPage";
import { RegionalPage } from "./settings/RegionalPage";

type NavItem = {
  id: string;
  label: string;
  icon: IconSvgElement;
  component: ComponentType;
};

const PAGES: NavItem[] = [
  { id: "general", label: "General", icon: Settings01Icon, component: GeneralPage },
  { id: "appearance", label: "Appearance", icon: PaintBoardIcon, component: AppearancePage },
  { id: "indexing", label: "Indexing", icon: HardDriveIcon, component: IndexingPage },
  { id: "regional", label: "Regional", icon: GlobeIcon, component: RegionalPage },
];

const appWindow = getCurrentWindow();

export function SettingsApp() {
  const [pageId, setPageId] = useState(PAGES[0].id);
  const current = PAGES.find((p) => p.id === pageId)!;
  const PageComponent = current.component;

  return (
    <div className="flex h-full rounded-lg overflow-hidden border border-border/50">
      <nav className="flex w-[200px] shrink-0 flex-col gap-0.5 border-r bg-card px-2 pb-3">
        <div className="h-9 shrink-0" data-tauri-drag-region />
        <h1 className="px-3 pb-5 text-xl font-semibold tracking-tight">Settings</h1>
        {PAGES.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            className={cn("justify-start gap-2 text-[13px]", pageId === item.id && "bg-accent")}
            onClick={() => setPageId(item.id)}
          >
            <HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-3.5" />
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-9 shrink-0 items-center justify-end" data-tauri-drag-region>
          <button
            className="inline-flex h-9 w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => appWindow.minimize()}
          >
            <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} className="size-3.5" />
          </button>
          <button
            className="inline-flex h-9 w-11 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => appWindow.toggleMaximize()}
          >
            <HugeiconsIcon icon={SquareIcon} strokeWidth={2} className="size-3" />
          </button>
          <button
            className="inline-flex h-9 w-11 items-center justify-center rounded-tr-sm text-muted-foreground hover:bg-red-500 hover:text-white"
            onClick={() => appWindow.hide()}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-9 pb-9">
          <h2 className="mb-5 text-xl font-semibold tracking-tight">{current.label}</h2>
          <PageComponent />
        </div>
      </div>
    </div>
  );
}
