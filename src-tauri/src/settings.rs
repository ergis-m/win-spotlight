//! App settings persistence and Windows autostart via scheduled task.

use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use winreg::enums::*;
use winreg::RegKey;

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const APP_NAME: &str = "Win Spotlight";
const TASK_NAME: &str = "WinSpotlightAutostart";

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    #[serde(default)]
    pub theme: Theme,
    #[serde(default)]
    pub launcher_size: LauncherSize,
    /// Legacy "big | small | none" mode. Kept only so we can migrate it into
    /// `widgets` on first load, then dropped (skipped on serialize).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub widgets_mode: Option<WidgetsMode>,
    #[serde(default)]
    pub widgets: WidgetsConfig,
    #[serde(default)]
    pub file_search: FileSearchSettings,
    /// When true, open browser tabs appear as individual search results.
    /// When false, the browser window is shown instead.
    #[serde(default = "default_true")]
    pub show_browser_tabs: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WidgetsConfig {
    /// Overall toggle — when false, no widgets render regardless of layout.
    pub enabled: bool,
    /// Ordered list. The frontend reconciles against its registry, so unknown
    /// IDs here are ignored and new widgets added to the app are appended.
    pub layout: Vec<WidgetLayoutEntry>,
    /// Legacy "big | small" field. Accepted on read and dropped on save —
    /// per-widget grid footprint replaces this.
    #[serde(default, skip_serializing)]
    #[allow(dead_code)]
    pub size: Option<String>,
}

impl Default for WidgetsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            layout: Vec::new(),
            size: None,
        }
    }
}

fn default_true() -> bool {
    true
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WidgetLayoutEntry {
    pub id: String,
    /// Legacy presence flag. Older files set this; the current UI curates by
    /// adding/removing entries, so placed widgets default to enabled.
    #[serde(default = "default_true")]
    pub enabled: bool,
    /// Grid-cell size override (frontend falls back to the registry default).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub w: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub h: Option<u32>,
    /// Per-widget options, opaque to the backend.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FileSearchSettings {
    pub enabled: bool,
    pub directories: Vec<String>,
    pub excluded_dirs: Vec<String>,
    pub max_depth: usize,
}

impl Default for FileSearchSettings {
    fn default() -> Self {
        let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users".into());
        Self {
            enabled: true,
            directories: vec![home],
            excluded_dirs: vec![
                "node_modules".into(), ".git".into(), ".hg".into(), "target".into(),
                "__pycache__".into(), ".cache".into(), "AppData".into(), "$Recycle.Bin".into(),
                ".vscode".into(), ".idea".into(), ".vs".into(), ".svn".into(),
                "vendor".into(), "dist".into(), "build".into(), ".next".into(), ".nuxt".into(),
            ],
            max_depth: 8,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

#[derive(Serialize, Deserialize, Clone, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LauncherSize {
    Compact,
    #[default]
    Normal,
    Fancy,
}

#[derive(Serialize, Deserialize, Clone, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum WidgetsMode {
    #[default]
    Big,
    Small,
    None,
}

impl LauncherSize {
    /// Returns (width, height) for the launcher window.
    pub fn dimensions(&self) -> (f64, f64) {
        match self {
            LauncherSize::Compact => (680.0, 440.0),
            LauncherSize::Normal => (800.0, 540.0),
            LauncherSize::Fancy => (960.0, 660.0),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::default(),
            launcher_size: LauncherSize::default(),
            widgets_mode: None,
            widgets: WidgetsConfig::default(),
            file_search: FileSearchSettings::default(),
            show_browser_tabs: true,
        }
    }
}

pub struct SettingsManager {
    pub inner: Mutex<Settings>,
    path: PathBuf,
}

impl SettingsManager {
    pub fn new() -> Self {
        let path = storage_path();
        let mut settings: Settings = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        // One-time migration from the legacy `widgets_mode` field. After this
        // runs the field is dropped from the on-disk file via skip_serializing.
        // Old "big"/"small" mode no longer maps to anything — per-widget grid
        // footprint replaces it. Only "none" still carries meaning.
        if let Some(WidgetsMode::None) = settings.widgets_mode.take() {
            settings.widgets.enabled = false;
        }
        // Drop the legacy size hint on save.
        settings.widgets.size = None;

        let mgr = Self {
            inner: Mutex::new(settings),
            path,
        };
        // Persist the post-migration state so the legacy field is removed on disk.
        mgr.save();
        mgr
    }

    pub fn save(&self) {
        let settings = self.inner.lock().unwrap();
        if let Ok(json) = serde_json::to_string_pretty(&*settings) {
            let _ = std::fs::write(&self.path, json);
        }
    }
}

pub fn is_autostart_enabled() -> bool {
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(RUN_KEY)
        .and_then(|key| key.get_value::<String, _>(APP_NAME))
        .is_ok()
}

pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu
        .open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE)
        .map_err(|e| e.to_string())?;

    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_path = exe.to_string_lossy().to_string();
        key.set_value(APP_NAME, &exe_path)
            .map_err(|e| e.to_string())?;
    } else {
        let _ = key.delete_value(APP_NAME);
    }

    // Clean up any legacy scheduled task
    let _ = Command::new("schtasks")
        .args(["/Delete", "/TN", TASK_NAME, "/F"])
        .creation_flags(0x08000000)
        .output();

    Ok(())
}

pub fn app_data_dir() -> PathBuf {
    let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    let dir = PathBuf::from(base).join("com.win-spotlight.launcher");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn storage_path() -> PathBuf {
    app_data_dir().join("settings.json")
}
