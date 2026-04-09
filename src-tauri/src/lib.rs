mod commands;
mod file_indexer;
mod file_search;
mod icons;
mod indexer;
mod network;
mod running;
mod search;
mod settings;
mod usage;
mod window;

use std::sync::Arc;

use raw_window_handle::HasWindowHandle;
use tauri::window::{Color, Effect, EffectState, EffectsBuilder};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
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
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            // Load persisted settings early (needed by several init steps).
            let settings_mgr = settings::SettingsManager::new();
            let launcher_dims = settings_mgr.inner.lock().unwrap().launcher_size.dimensions();
            let file_search_settings = settings_mgr.inner.lock().unwrap().file_search.clone();
            let app_data_dir = settings::app_data_dir();
            app.manage(settings_mgr);

            // Load app index from cache (instant), then rebuild in background.
            let index = Arc::new(indexer::AppIndex::new(&app_data_dir));
            let cached = index.entries.lock().unwrap().len();
            println!("Loaded {} apps from cache", cached);
            index.start_background_rebuild(app_data_dir.clone());
            app.manage(index);
            app.manage(usage::UsageTracker::new());
            app.manage(window::PinState::new());

            // Start background file indexing.
            let file_index = Arc::new(file_indexer::FileIndex::new());
            app.manage(file_index.clone());
            file_indexer::start_background_indexing(file_index, app_data_dir, file_search_settings);

            // Resize the main window to the saved launcher size.
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(
                    launcher_dims.0,
                    launcher_dims.1,
                )));
            }

            // Always use Alt+Space as the activation shortcut.
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

            // Rounded corners + shadow for the settings window.
            if let Some(win) = app.get_webview_window("settings") {
                set_rounded_corners(&win);
                let _ = win.hide();
            }

            // Build tray menu with Settings and Quit.
            let settings_item = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let tray_menu = MenuBuilder::new(app)
                .item(&settings_item)
                .separator()
                .item(&quit_item)
                .build()?;

            if let Some(tray) = app.tray_by_id("main") {
                tray.set_menu(Some(tray_menu))?;
                tray.on_menu_event(|app, event| match event.id().as_ref() {
                    "settings" => {
                        if let Some(main_win) = app.get_webview_window("main") {
                            let _ = main_win.hide();
                        }
                        if let Some(win) = app.get_webview_window("settings") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });
            }

            Ok(())
        })
        .on_window_event(|win, event| {
            if win.label() == "main" {
                if let WindowEvent::Focused(false) = event {
                    let pinned = win.state::<window::PinState>().is_pinned();
                    if !pinned {
                        if cfg!(debug_assertions) {
                            println!("[dev] launcher lost focus — hiding");
                        }
                        let _ = win.hide();
                    }
                }
            } else if win.label() == "settings" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
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
            commands::set_theme,
            commands::set_launcher_size,
            commands::get_file_search_settings,
            commands::set_file_search_settings,
            commands::rebuild_file_index,
            commands::get_file_index_status,
            commands::get_file_thumbnail,
            commands::get_network_info,
            commands::is_pinned,
            commands::toggle_pin,
            commands::is_onboarding_completed,
            commands::complete_onboarding,
            commands::reset_onboarding,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            // Keep the app alive when the last visible window closes,
            // since the main launcher window stays hidden until summoned.
            // Only prevent window-driven exits (code == None); allow explicit
            // app.exit() calls (e.g. tray "Quit") to proceed.
            if let tauri::RunEvent::ExitRequested { code, api, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
