import { useState, useEffect, useCallback, useRef, type ComponentType } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { applyTheme, type Theme } from "@/lib/theme";
import {
  getOverrides,
  saveOverrides,
  getSystemDefaults,
  COMMON_TIMEZONES,
  COMMON_CURRENCIES,
  CURRENCY_NAMES,
} from "@/lib/locale";
import {
  Settings as SettingsIcon,
  Globe,
  Info,
  type LucideIcon,
} from "lucide-react";

// ─── Shared Components ───────────────────────────────────────────

interface AppSettings {
  autostart: boolean;
  shortcut: string;
  theme: string;
}

function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      {children}
    </div>
  );
}

function SettingsSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Card className="py-0">
      <CardContent className="p-0 divide-y divide-border">{children}</CardContent>
    </Card>
  );
}

function displayShortcut(s: string): string {
  return s.replace(/\+/g, " + ");
}

// ─── General ─────────────────────────────────────────────────────

function GeneralPage() {
  const [autostart, setAutostart] = useState(false);
  const [shortcutText, setShortcutText] = useState("Alt + Space");
  const [recording, setRecording] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const prevShortcutRef = useRef("");

  useEffect(() => {
    invoke<AppSettings>("get_settings")
      .then((s) => {
        setAutostart(s.autostart);
        setShortcutText(displayShortcut(s.shortcut));
        setTheme(s.theme as Theme);
      })
      .catch((e) => console.error("Failed to load settings:", e));
  }, []);

  const handleAutostartChange = async (checked: boolean) => {
    setAutostart(checked);
    try {
      await invoke("set_autostart", { enabled: checked });
    } catch {
      setAutostart(!checked);
    }
  };

  const handleThemeChange = async (value: string) => {
    const newTheme = value as Theme;
    setTheme(newTheme);
    applyTheme(newTheme);
    try {
      await invoke("set_theme", { theme: newTheme });
    } catch {
      setTheme(theme);
      applyTheme(theme);
    }
  };

  const startRecording = useCallback(async () => {
    if (recording) return;

    prevShortcutRef.current = shortcutText;

    try {
      await invoke("start_recording");
    } catch {
      return;
    }

    setRecording(true);
    setShortcutText("Press a shortcut\u2026");

    let unRec: UnlistenFn | undefined;
    let unCancel: UnlistenFn | undefined;

    const cleanup = () => {
      setRecording(false);
      unRec?.();
      unCancel?.();
    };

    unRec = await listen<string>("shortcut-recorded", async (ev) => {
      cleanup();
      try {
        await invoke("stop_recording");
        await invoke("set_shortcut", { shortcut: ev.payload });
        setShortcutText(displayShortcut(ev.payload));
      } catch {
        setShortcutText(prevShortcutRef.current);
        await invoke("stop_recording");
        await invoke("resume_shortcut");
      }
    });

    unCancel = await listen<string>("shortcut-cancelled", async () => {
      cleanup();
      setShortcutText(prevShortcutRef.current);
      await invoke("stop_recording");
      await invoke("resume_shortcut");
    });
  }, [recording, shortcutText]);

  return (
    <div className="space-y-2">
      <SettingsSection>
        <SettingsRow
          title="Theme"
          description="Select your preferred appearance"
        >
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection>
        <SettingsRow
          title="Launch at login"
          description="Start Win Spotlight when you sign in to Windows"
        >
          <Switch checked={autostart} onCheckedChange={handleAutostartChange} />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection>
        <SettingsRow
          title="Activation shortcut"
          description="Click to record a new shortcut"
        >
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "shrink-0 text-xs",
              recording && "border-indigo-500 text-indigo-400 bg-indigo-500/10"
            )}
            onClick={startRecording}
          >
            {shortcutText}
          </Button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

// ─── Regional ────────────────────────────────────────────────────

function formatTzLabel(tz: string): string {
  const offset = new Date().toLocaleTimeString("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .split(" ").pop() || "";
  const city = tz.split("/").pop()!.replace(/_/g, " ");
  return `${city} (${offset})`;
}

function RegionalPage() {
  const sys = getSystemDefaults();
  const overrides = getOverrides();

  const [timezone, setTimezone] = useState(overrides.timezone || "auto");
  const [currency, setCurrency] = useState(overrides.currency || "auto");

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    saveOverrides({ ...getOverrides(), timezone: value === "auto" ? undefined : value });
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    saveOverrides({ ...getOverrides(), currency: value === "auto" ? undefined : value });
  };

  return (
    <div className="space-y-2">
      <SettingsSection>
        <SettingsRow
          title="Timezone"
          description={`System detected: ${sys.timezone}`}
        >
          <Select value={timezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({sys.timezoneShort})</SelectItem>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {formatTzLabel(tz)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection>
        <SettingsRow
          title="Currency"
          description={`System detected: ${sys.currency}`}
        >
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto ({sys.currency})</SelectItem>
              {COMMON_CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {CURRENCY_NAMES[code] || code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

// ─── About ───────────────────────────────────────────────────────

function AboutPage() {
  return (
    <div className="space-y-2">
      <Card className="py-0">
        <CardContent className="p-4">
          <div className="text-sm font-semibold">Win Spotlight</div>
          <div className="mt-1 text-xs text-muted-foreground">Version 0.1.0</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page Registry ───────────────────────────────────────────────

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
};

const PAGES: NavItem[] = [
  { id: "general",  label: "General",  icon: SettingsIcon, component: GeneralPage },
  { id: "regional", label: "Regional", icon: Globe,        component: RegionalPage },
  { id: "about",    label: "About",    icon: Info,         component: AboutPage },
];

// ─── Shell ───────────────────────────────────────────────────────

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
