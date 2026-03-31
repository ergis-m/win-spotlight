use tauri::{AppHandle, Manager};

/// Toggle the main launcher window visibility.
/// Centers and focuses when showing, hides on second press.
pub fn toggle_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.center();
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}
