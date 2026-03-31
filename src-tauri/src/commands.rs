use crate::indexer::AppIndex;
use crate::running;
use crate::search;
use crate::settings::SettingsManager;
use crate::usage::UsageTracker;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

#[tauri::command]
pub fn search(
    query: String,
    index: State<'_, AppIndex>,
    tracker: State<'_, UsageTracker>,
) -> Vec<search::SearchResult> {
    search::query(&index, &tracker, &query, 8)
}

/// Activate a search result — either switch to a running window or launch an app.
#[tauri::command]
pub fn activate_item(
    id: String,
    index: State<'_, AppIndex>,
    tracker: State<'_, UsageTracker>,
    app: AppHandle,
) -> Result<(), String> {
    if let Some(hwnd_str) = id.strip_prefix("window:") {
        let hwnd: isize = hwnd_str.parse().map_err(|_| "Invalid window handle")?;
        running::switch_to(hwnd);
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
                .spawn()
                .map_err(|e| e.to_string())?;
        } else if !entry.app_user_model_id.is_empty() {
            let shell_path = format!("shell:AppsFolder\\{}", entry.app_user_model_id);
            std::process::Command::new("explorer")
                .arg(&shell_path)
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
    pub shortcut: String,
    pub theme: String,
}

#[tauri::command]
pub fn get_settings(manager: State<'_, SettingsManager>) -> SettingsResponse {
    let s = manager.inner.lock().unwrap();
    SettingsResponse {
        autostart: crate::settings::is_autostart_enabled(),
        shortcut: s.shortcut.clone(),
        theme: serde_json::to_value(&s.theme)
            .ok()
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "system".to_string()),
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
pub fn set_shortcut(
    shortcut: String,
    manager: State<'_, SettingsManager>,
    app: AppHandle,
) -> Result<(), String> {
    let new: Shortcut = shortcut
        .parse()
        .map_err(|_| "Invalid shortcut format".to_string())?;

    let old_str = manager.inner.lock().unwrap().shortcut.clone();

    let gs = app.global_shortcut();
    gs.unregister_all().map_err(|e| e.to_string())?;

    if let Err(e) = gs.register(new) {
        // Rollback: re-register the previous shortcut.
        if let Ok(old) = old_str.parse::<Shortcut>() {
            let _ = gs.register(old);
        }
        return Err(format!("Failed to register shortcut: {}", e));
    }

    manager.inner.lock().unwrap().shortcut = shortcut;
    manager.save();
    Ok(())
}

/// Suspend the global shortcut and install a low-level keyboard hook
/// so the next key combo is captured at the OS level.
#[tauri::command]
pub fn start_recording(app: AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;
    let handle = app.clone();
    app.run_on_main_thread(move || crate::recorder::start(handle))
        .map_err(|e| e.to_string())
}

/// Remove the keyboard hook (does NOT re-register shortcuts).
#[tauri::command]
pub fn stop_recording(app: AppHandle) -> Result<(), String> {
    app.run_on_main_thread(crate::recorder::stop)
        .map_err(|e| e.to_string())
}

/// Re-register the saved shortcut (cancel / cleanup path).
#[tauri::command]
pub fn resume_shortcut(
    manager: State<'_, SettingsManager>,
    app: AppHandle,
) -> Result<(), String> {
    let s = manager.inner.lock().unwrap().shortcut.clone();
    let shortcut: Shortcut = s
        .parse()
        .map_err(|_| "Invalid saved shortcut".to_string())?;
    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| e.to_string())
}
