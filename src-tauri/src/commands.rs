use crate::search;
use tauri::{AppHandle, Manager};

/// Search the item catalog with a fuzzy query.
#[tauri::command]
pub fn search(query: String) -> Vec<search::SearchItem> {
    let catalog = search::get_catalog();
    search::fuzzy_search(&query, &catalog, 8)
}

/// Execute an item's action by its ID.
#[tauri::command]
pub fn execute_item(id: String, app: AppHandle) -> Result<(), String> {
    let catalog = search::get_catalog();
    let item = catalog
        .iter()
        .find(|i| i.id == id)
        .ok_or_else(|| format!("Item not found: {}", id))?;

    match &item.action {
        search::ItemAction::RunCommand(cmd) => {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", cmd])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        search::ItemAction::OpenUrl(url) => {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", url])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        search::ItemAction::Copy(text) => {
            // TODO: clipboard integration
            println!("Copy: {}", text);
        }
    }

    // Hide the window after executing
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }

    Ok(())
}

/// Hide the launcher window (called when user presses Escape).
#[tauri::command]
pub fn hide_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}
