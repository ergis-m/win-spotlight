use std::os::windows::process::CommandExt;
use std::sync::Arc;

use crate::file_indexer::{self, FileIndex, FileIndexStatus};
use crate::indexer::AppIndex;
use crate::running;
use crate::search;
use crate::settings::SettingsManager;
use crate::usage::UsageTracker;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn search(
    query: String,
    mode: String,
    index: State<'_, Arc<AppIndex>>,
    file_index: State<'_, Arc<FileIndex>>,
    tracker: State<'_, UsageTracker>,
    settings_mgr: State<'_, SettingsManager>,
) -> Vec<search::SearchResult> {
    search::query(&index, &file_index, &tracker, &settings_mgr, &query, &mode, 10)
}

/// Activate a search result — either switch to a running window or launch an app.
#[tauri::command]
pub fn activate_item(
    id: String,
    index: State<'_, Arc<AppIndex>>,
    tracker: State<'_, UsageTracker>,
    app: AppHandle,
) -> Result<(), String> {
    if let Some(url) = id.strip_prefix("url:") {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else if let Some(hwnd_str) = id.strip_prefix("window:") {
        let hwnd: isize = hwnd_str.parse().map_err(|_| "Invalid window handle")?;
        running::switch_to(hwnd);
    } else if let Some(file_path) = id.strip_prefix("file:") {
        tracker.record(&id);
        std::process::Command::new("cmd")
            .args(["/C", "start", "", file_path])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        tracker.record(&id);

        let entries = index.entries.lock().unwrap();
        let entry = entries
            .iter()
            .find(|e| e.id == id)
            .ok_or_else(|| format!("App not found: {}", id))?;

        if !entry.shortcut_path.is_empty() {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", &entry.shortcut_path])
                .creation_flags(0x08000000)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else if !entry.app_user_model_id.is_empty() {
            let shell_path = format!("shell:AppsFolder\\{}", entry.app_user_model_id);
            std::process::Command::new("explorer")
                .arg(&shell_path)
                .creation_flags(0x08000000)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }

    Ok(())
}

#[tauri::command]
pub fn hide_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn open_settings(app: AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.hide();
    }
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

// ── Settings commands ──

#[derive(serde::Serialize)]
pub struct SettingsResponse {
    pub autostart: bool,
    pub theme: String,
    pub launcher_size: String,
}

#[tauri::command]
pub fn get_settings(manager: State<'_, SettingsManager>) -> SettingsResponse {
    // Read settings and release the mutex BEFORE calling is_autostart_enabled(),
    // which spawns a blocking subprocess (schtasks). Holding the lock during that
    // call blocks every other command that needs SettingsManager (e.g. search).
    let (theme, launcher_size) = {
        let s = manager.inner.lock().unwrap();
        (
            serde_json::to_value(&s.theme)
                .ok()
                .and_then(|v| v.as_str().map(String::from))
                .unwrap_or_else(|| "system".to_string()),
            serde_json::to_value(&s.launcher_size)
                .ok()
                .and_then(|v| v.as_str().map(String::from))
                .unwrap_or_else(|| "normal".to_string()),
        )
    };
    SettingsResponse {
        autostart: crate::settings::is_autostart_enabled(),
        theme,
        launcher_size,
    }
}

#[tauri::command]
pub fn set_theme(
    theme: String,
    manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    let t: crate::settings::Theme =
        serde_json::from_value(serde_json::Value::String(theme))
            .map_err(|_| "Invalid theme value".to_string())?;
    manager.inner.lock().unwrap().theme = t;
    manager.save();
    Ok(())
}

#[tauri::command]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    crate::settings::set_autostart(enabled)
}

#[tauri::command]
pub fn set_launcher_size(
    size: String,
    manager: State<'_, SettingsManager>,
    app: AppHandle,
) -> Result<(), String> {
    let s: crate::settings::LauncherSize =
        serde_json::from_value(serde_json::Value::String(size))
            .map_err(|_| "Invalid launcher size value".to_string())?;
    let (w, h) = s.dimensions();
    manager.inner.lock().unwrap().launcher_size = s;
    manager.save();
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(w, h)));
        let _ = win.center();
    }
    Ok(())
}

// ── File search settings commands ──

#[tauri::command]
pub fn get_file_search_settings(
    manager: State<'_, SettingsManager>,
) -> crate::settings::FileSearchSettings {
    manager.inner.lock().unwrap().file_search.clone()
}

#[tauri::command]
pub fn set_file_search_settings(
    settings: crate::settings::FileSearchSettings,
    manager: State<'_, SettingsManager>,
    file_index: State<'_, Arc<FileIndex>>,
) {
    let app_data_dir = crate::settings::app_data_dir();
    manager.inner.lock().unwrap().file_search = settings.clone();
    manager.save();

    if settings.enabled {
        file_indexer::rebuild_index((*file_index).clone(), app_data_dir, settings);
    } else {
        *file_index.entries.lock().unwrap() = Vec::new();
        file_index.ready.store(false, std::sync::atomic::Ordering::SeqCst);
    }
}

#[tauri::command]
pub fn rebuild_file_index(
    manager: State<'_, SettingsManager>,
    file_index: State<'_, Arc<FileIndex>>,
) {
    let settings = manager.inner.lock().unwrap().file_search.clone();
    let app_data_dir = crate::settings::app_data_dir();
    file_indexer::rebuild_index((*file_index).clone(), app_data_dir, settings);
}

#[tauri::command]
pub fn get_file_index_status(
    file_index: State<'_, Arc<FileIndex>>,
) -> FileIndexStatus {
    file_index.status()
}

#[tauri::command]
pub fn is_onboarding_completed(manager: State<'_, SettingsManager>) -> bool {
    manager.inner.lock().unwrap().onboarding_completed
}

#[tauri::command]
pub fn complete_onboarding(manager: State<'_, SettingsManager>) {
    manager.inner.lock().unwrap().onboarding_completed = true;
    manager.save();
}

#[tauri::command]
pub fn reset_onboarding(manager: State<'_, SettingsManager>) {
    manager.inner.lock().unwrap().onboarding_completed = false;
    manager.save();
}

#[tauri::command]
pub fn get_file_thumbnail(path: String) -> Option<String> {
    crate::icons::extract_file_thumbnail(&path, 64)
}

#[tauri::command]
pub fn get_network_info() -> crate::network::NetworkInfo {
    crate::network::get_network_info()
}

