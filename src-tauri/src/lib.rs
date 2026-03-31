mod commands;
mod icons;
mod indexer;
mod running;
mod search;
mod usage;
mod window;

use raw_window_handle::HasWindowHandle;
use tauri::window::{Color, Effect, EffectState, EffectsBuilder};
use tauri::{Manager, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWM_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND};

/// Apply rounded corners via DWM on Windows 11.
fn set_rounded_corners(win: &tauri::WebviewWindow) {
    if let Ok(handle) = win.window_handle() {
        if let raw_window_handle::RawWindowHandle::Win32(h) = handle.as_ref() {
            let preference = DWMWCP_ROUND;
            unsafe {
                let _ = DwmSetWindowAttribute(
                    windows::Win32::Foundation::HWND(h.hwnd.get() as *mut _),
                    DWMWA_WINDOW_CORNER_PREFERENCE,
                    &preference as *const DWM_WINDOW_CORNER_PREFERENCE as *const _,
                    std::mem::size_of::<DWM_WINDOW_CORNER_PREFERENCE>() as u32,
                );
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        window::toggle_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Build the app index from Start Menu shortcuts.
            let index = indexer::AppIndex::new();
            let count = index.entries.lock().unwrap().len();
            println!("Indexed {} apps", count);
            app.manage(index);
            app.manage(usage::UsageTracker::new());

            // Register the global shortcut.
            let shortcut: Shortcut = "Alt+Space".parse().unwrap();
            app.global_shortcut().register(shortcut)?;

            // Apply acrylic blur and hide on launch — user activates via shortcut.
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_effects(
                    EffectsBuilder::new()
                        .effect(Effect::Acrylic)
                        .state(EffectState::Active)
                        .color(Color(24, 24, 28, 180))
                        .build(),
                );
                set_rounded_corners(&win);
                let _ = win.hide();
            }

            Ok(())
        })
        .on_window_event(|win, event| {
            if let WindowEvent::Focused(false) = event {
                let _ = win.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::search,
            commands::activate_item,
            commands::hide_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
