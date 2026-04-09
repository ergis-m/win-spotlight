import type { ComponentProps, ComponentType } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const TopOffset = ({ className, ...props }: ComponentProps<"div">) => {
  return <div data-tauri-drag-region className={cn("h-12", className)} {...props} />;
};

export function SettingsApp() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex h-9 shrink-0 items-center justify-end absolute top-0 right-0">
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
          className="inline-flex h-9 w-11 items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white"
          onClick={() => appWindow.hide()}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
        </button>
      </div>
      <Tabs
        defaultValue={PAGES[0].id}
        orientation="vertical"
        className="flex h-full w-full flex-row gap-0"
      >
        <nav className="flex w-50 shrink-0 flex-col border-r bg-card">
          <TopOffset className="items-center flex pl-4">
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          </TopOffset>
          <TabsList
            variant="line"
            className="flex w-full flex-col items-stretch bg-transparent px-3 h-fit pt-3"
          >
            {PAGES.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className={cn(
                  "justify-start gap-2 rounded-md! px-3 py-0 text-[13px] font-medium",
                  "text-muted-foreground hover:bg-accent hover:text-foreground",
                  "data-[state=active]:bg-accent! data-[state=active]:text-foreground",
                  "after:hidden border-none!",
                )}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-3.5" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </nav>
        <div className="w-full h-full">
          {PAGES.map((item) => (
            <TabsContent
              key={item.id}
              value={item.id}
              className="h-full flex flex-col grow shrink-0"
            >
              <TopOffset className="items-center flex pl-4">
                <h3 className="text-lg font-semibold tracking-tight">{item.label}</h3>
              </TopOffset>
              <div className="px-3 flex-1 h-0 overflow-auto py-3">
                <item.component />
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
