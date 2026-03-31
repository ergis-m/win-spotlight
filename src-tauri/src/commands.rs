use crate::indexer::AppIndex;
use crate::search;
use tauri::{AppHandle, Manager, State};

/// Search the app index with a fuzzy query.
#[tauri::command]
pub fn search(query: String, index: State<'_, AppIndex>) -> Vec<search::SearchResult> {
    search::query(&index, &query, 8)
}

/// Launch an app by its ID.
#[tauri::command]
pub fn execute_item(id: String, index: State<'_, AppIndex>, app: AppHandle) -> Result<(), String> {
    let entries = index.entries.lock().unwrap();
    let entry = entries
        .iter()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("App not found: {}", id))?;

    if !entry.shortcut_path.is_empty() {
        // Launch via .lnk shortcut — Windows resolves the target.
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &entry.shortcut_path])
            .spawn()
            .map_err(|e| e.to_string())?;
    } else if !entry.app_user_model_id.is_empty() {
        // Launch UWP app via shell:AppsFolder.
        let shell_path = format!("shell:AppsFolder\\{}", entry.app_user_model_id);
        std::process::Command::new("explorer")
            .arg(&shell_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        return Err("No launch method available".into());
    }

    drop(entries);

    // Hide the window after launching.
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }

    Ok(())
}

/// Hide the launcher window (called on Escape).
#[tauri::command]
pub fn hide_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}
