import { useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon,
  Globe,
  Info,
  Palette,
  HardDrive,
  type LucideIcon,
} from "lucide-react";
import { GeneralPage } from "./settings/GeneralPage";
import { AppearancePage } from "./settings/AppearancePage";
import { IndexingPage } from "./settings/IndexingPage";
import { RegionalPage } from "./settings/RegionalPage";
import { AboutPage } from "./settings/AboutPage";

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
};

const PAGES: NavItem[] = [
  { id: "general",    label: "General",    icon: SettingsIcon, component: GeneralPage },
  { id: "appearance", label: "Appearance", icon: Palette,      component: AppearancePage },
  { id: "indexing",   label: "Indexing",   icon: HardDrive,    component: IndexingPage },
  { id: "regional",   label: "Regional",   icon: Globe,        component: RegionalPage },
  { id: "about",      label: "About",      icon: Info,         component: AboutPage },
];

export function SettingsApp() {
  const [pageId, setPageId] = useState(PAGES[0].id);
  const current = PAGES.find((p) => p.id === pageId)!;
  const PageComponent = current.component;

  return (
    <div className="flex h-full">
      <nav className="flex w-[200px] shrink-0 flex-col gap-0.5 border-r bg-card px-2 pt-9 pb-3">
        <h1 className="px-3 pb-5 text-xl font-semibold tracking-tight">Settings</h1>
        {PAGES.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 text-[13px]",
                pageId === item.id &&
                  "bg-accent relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[3px] before:rounded-full before:bg-primary"
              )}
              onClick={() => setPageId(item.id)}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Button>
          );
        })}
      </nav>
      <div className="flex-1 overflow-y-auto p-9">
        <h2 className="mb-5 text-xl font-semibold tracking-tight">{current.label}</h2>
        <PageComponent />
      </div>
    </div>
  );
}
