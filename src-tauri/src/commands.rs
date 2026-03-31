use crate::indexer::AppIndex;
use crate::running;
use crate::search;
use crate::usage::UsageTracker;
use tauri::{AppHandle, Manager, State};

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
