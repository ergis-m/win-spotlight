//! App settings persistence and Windows autostart via scheduled task.

use serde::{Deserialize, Serialize};
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
    #[serde(default)]
    pub file_search: FileSearchSettings,
    #[serde(default)]
    pub onboarding_completed: bool,
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

impl LauncherSize {
    /// Returns (width, height) for the launcher window.
    pub fn dimensions(&self) -> (f64, f64) {
        match self {
            LauncherSize::Compact => (580.0, 360.0),
            LauncherSize::Normal => (640.0, 420.0),
            LauncherSize::Fancy => (720.0, 500.0),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::default(),
            launcher_size: LauncherSize::default(),
            file_search: FileSearchSettings::default(),
            onboarding_completed: false,
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
    // Check scheduled task first, fall back to registry for migration
    let task_exists = Command::new("schtasks")
        .args(["/Query", "/TN", TASK_NAME])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if task_exists {
        return true;
    }

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey(RUN_KEY)
        .and_then(|key| key.get_value::<String, _>(APP_NAME))
        .is_ok()
}

pub fn set_autostart(enabled: bool) -> Result<(), String> {
    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_path = exe.to_string_lossy().to_string();

        // Create a scheduled task that runs at logon with high priority
        let xml = format!(
            r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Start Win Spotlight at logon</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>4</Priority>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
  </Settings>
  <Actions>
    <Exec>
      <Command>{exe_path}</Command>
    </Exec>
  </Actions>
</Task>"#
        );

        // Write XML to a temp file
        let temp_dir = std::env::temp_dir();
        let xml_path = temp_dir.join("winspotlight_task.xml");
        std::fs::write(&xml_path, xml).map_err(|e| e.to_string())?;

        let output = Command::new("schtasks")
            .args([
                "/Create",
                "/TN",
                TASK_NAME,
                "/XML",
                &xml_path.to_string_lossy(),
                "/F",
            ])
            .output()
            .map_err(|e| e.to_string())?;

        let _ = std::fs::remove_file(&xml_path);

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        // Clean up old registry entry if it exists
        if let Ok(key) = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE)
        {
            let _ = key.delete_value(APP_NAME);
        }

        Ok(())
    } else {
        // Remove scheduled task
        let _ = Command::new("schtasks")
            .args(["/Delete", "/TN", TASK_NAME, "/F"])
            .output();

        // Also clean up registry entry in case it exists
        if let Ok(key) = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE)
        {
            let _ = key.delete_value(APP_NAME);
        }

        Ok(())
    }
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
