mod commands;
mod search;
mod window;

use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        window::toggle_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Register the global shortcut
            let shortcut: Shortcut = "Alt+Space".parse().unwrap();
            app.global_shortcut().register(shortcut)?;

            // Hide window on launch — user activates via shortcut
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.hide();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::search,
            commands::execute_item,
            commands::hide_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
