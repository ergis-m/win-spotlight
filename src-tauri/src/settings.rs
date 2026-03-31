//! App settings persistence and Windows autostart via registry.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use winreg::enums::*;
use winreg::RegKey;

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const APP_NAME: &str = "Win Spotlight";

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    pub shortcut: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            shortcut: "Alt+Space".to_string(),
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
        let settings = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        Self {
            inner: Mutex::new(settings),
            path,
        }
    }

    pub fn save(&self) {
        let settings = self.inner.lock().unwrap();
        if let Ok(json) = serde_json::to_string_pretty(&*settings) {
            let _ = std::fs::write(&self.path, json);
        }
    }
}

pub fn is_autostart_enabled() -> bool {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey(RUN_KEY)
        .and_then(|key| key.get_value::<String, _>(APP_NAME))
        .is_ok()
}

pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if enabled {
        let (key, _) = hkcu.create_subkey(RUN_KEY).map_err(|e| e.to_string())?;
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        key.set_value(APP_NAME, &exe.to_string_lossy().to_string())
            .map_err(|e| e.to_string())
    } else {
        if let Ok(key) = hkcu.open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE) {
            let _ = key.delete_value(APP_NAME);
        }
        Ok(())
    }
}

fn storage_path() -> PathBuf {
    let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    let dir = PathBuf::from(base).join("com.win-spotlight.launcher");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("settings.json")
}
