mod commands;
mod icons;
mod indexer;
mod recorder;
mod running;
mod search;
mod settings;
mod usage;
mod window;

use raw_window_handle::HasWindowHandle;
use tauri::window::{Color, Effect, EffectState, EffectsBuilder};
use tauri::{Manager, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE, DWMWA_WINDOW_CORNER_PREFERENCE, DWM_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND};

/// Apply dark title bar via DWM on Windows 11.
fn set_dark_title_bar(win: &tauri::WebviewWindow) {
    if let Ok(handle) = win.window_handle() {
        if let raw_window_handle::RawWindowHandle::Win32(h) = handle.as_ref() {
            let dark: i32 = 1;
            unsafe {
                let _ = DwmSetWindowAttribute(
                    windows::Win32::Foundation::HWND(h.hwnd.get() as *mut _),
                    DWMWA_USE_IMMERSIVE_DARK_MODE,
                    &dark as *const i32 as *const _,
                    std::mem::size_of::<i32>() as u32,
                );
            }
        }
    }
}

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

            // Load persisted settings and register the saved shortcut.
            let settings_mgr = settings::SettingsManager::new();
            let saved = settings_mgr.inner.lock().unwrap().shortcut.clone();
            app.manage(settings_mgr);

            let shortcut: Shortcut = saved
                .parse()
                .unwrap_or_else(|_| "Alt+Space".parse().unwrap());
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

            // Dark title bar for the settings window.
            if let Some(win) = app.get_webview_window("settings") {
                set_dark_title_bar(&win);
                let _ = win.hide();
            }

            Ok(())
        })
        .on_window_event(|win, event| {
            if win.label() == "main" {
                if let WindowEvent::Focused(false) = event {
                    let _ = win.hide();
                }
            } else if win.label() == "settings" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    // Stop any active recording and ensure the shortcut is registered.
                    recorder::stop();
                    let app = win.app_handle();
                    let mgr = app.state::<settings::SettingsManager>();
                    let s = mgr.inner.lock().unwrap().shortcut.clone();
                    let gs = app.global_shortcut();
                    let _ = gs.unregister_all();
                    if let Ok(sc) = s.parse::<Shortcut>() {
                        let _ = gs.register(sc);
                    }
                    let _ = win.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::search,
            commands::activate_item,
            commands::hide_window,
            commands::open_settings,
            commands::get_settings,
            commands::set_autostart,
            commands::set_shortcut,
            commands::start_recording,
            commands::stop_recording,
            commands::resume_shortcut,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            // Keep the app alive when the last visible window closes,
            // since the main launcher window stays hidden until summoned.
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
