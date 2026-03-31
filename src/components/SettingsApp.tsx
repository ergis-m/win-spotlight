import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface AppSettings {
  autostart: boolean;
  shortcut: string;
}

function displayShortcut(s: string): string {
  return s.replace(/\+/g, " + ");
}

const NAV_ITEMS = [
  { id: "general", label: "General" },
  { id: "about", label: "About" },
] as const;

type PageId = (typeof NAV_ITEMS)[number]["id"];

function GeneralPage() {
  const [autostart, setAutostart] = useState(false);
  const [shortcutText, setShortcutText] = useState("Alt + Space");
  const [recording, setRecording] = useState(false);
  const prevShortcutRef = useRef("");

  useEffect(() => {
    invoke<AppSettings>("get_settings")
      .then((s) => {
        setAutostart(s.autostart);
        setShortcutText(displayShortcut(s.shortcut));
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
    <div className="settings-page">
      <h2 className="settings-page-title">General</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-title">Launch at login</div>
            <div className="settings-row-desc">
              Start Win Spotlight when you sign in to Windows
            </div>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={autostart}
              onChange={(e) => handleAutostartChange(e.target.checked)}
            />
            <span className="settings-toggle-track" />
          </label>
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-title">Activation shortcut</div>
            <div className="settings-row-desc">
              Click to record a new shortcut
            </div>
          </div>
          <button
            className={`settings-shortcut${recording ? " recording" : ""}`}
            type="button"
            onClick={startRecording}
          >
            {shortcutText}
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="settings-page">
      <h2 className="settings-page-title">About</h2>
      <div className="settings-card">
        <div className="settings-about">
          <div className="settings-about-name">Win Spotlight</div>
          <div className="settings-about-version">Version 0.1.0</div>
        </div>
      </div>
    </div>
  );
}

export function SettingsApp() {
  const [page, setPage] = useState<PageId>("general");

  return (
    <div className="settings">
      <nav className="settings-nav">
        <h1 className="settings-nav-title">Settings</h1>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`settings-nav-item${page === item.id ? " active" : ""}`}
            onClick={() => setPage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="settings-content">
        {page === "general" ? <GeneralPage /> : <AboutPage />}
      </div>
    </div>
  );
}
