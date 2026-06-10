use std::os::windows::process::CommandExt;
use std::sync::Arc;

use crate::file_indexer::{self, FileIndex, FileIndexStatus};
use crate::icon_cache::IconCache;
use crate::indexer::AppIndex;
use crate::running;
use crate::search;
use crate::settings::SettingsManager;
use crate::steam::SteamIndex;
use crate::usage::UsageTracker;
use tauri::{AppHandle, Manager, State};

/// Async so it runs on the thread pool, not the main thread — fuzzy-matching
/// a large file index per keystroke would otherwise stall the event loop and
/// freeze the UI. (Async commands with `State` must return `Result`.)
#[tauri::command]
pub async fn search(
    query: String,
    mode: String,
    index: State<'_, Arc<AppIndex>>,
    file_index: State<'_, Arc<FileIndex>>,
    steam_index: State<'_, SteamIndex>,
    tracker: State<'_, UsageTracker>,
    settings_mgr: State<'_, SettingsManager>,
) -> Result<Vec<search::SearchResult>, String> {
    Ok(search::query(&index, &file_index, &steam_index, &tracker, &settings_mgr, &query, &mode, 10))
}

/// Icon for a search result, fetched by id like a resource and cached on
/// both sides — the frontend keeps a per-id observable, this end dedupes
/// window/tab extraction per executable. Async because window icon
/// extraction can wait up to 100ms on a hung window (WM_GETICON timeout).
#[tauri::command]
pub async fn get_app_icon(
    id: String,
    index: State<'_, Arc<AppIndex>>,
    steam_index: State<'_, SteamIndex>,
    cache: State<'_, IconCache>,
) -> Result<Option<String>, String> {
    Ok(cache.resolve(&id, &index, &steam_index))
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
    } else if let Some(rest) = id.strip_prefix("tab:") {
        // Format: "hwnd:tab_title" — split on first ':' only.
        if let Some(colon) = rest.find(':') {
            let hwnd: isize = rest[..colon].parse().map_err(|_| "Invalid window handle")?;
            let tab_title = &rest[colon + 1..];
            crate::browser_tabs::switch_to_tab(hwnd, tab_title);
        }
    } else if let Some(hwnd_str) = id.strip_prefix("window:") {
        let hwnd: isize = hwnd_str.parse().map_err(|_| "Invalid window handle")?;
        running::switch_to(hwnd);
    } else if let Some(app_id) = id.strip_prefix("steam:") {
        let uri = format!("steam://rungameid/{}", app_id);
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &uri])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
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

/// Called by the frontend whenever the launcher's content height changes;
/// spring-animates the window (and its acrylic backdrop) to match.
#[tauri::command]
pub fn set_launcher_height(height: f64, app: AppHandle) {
    crate::window::animate_height(&app, height.max(16.0));
}

#[tauri::command]
pub fn open_settings(app: AppHandle) {
    crate::window::show_settings_window(&app);
}

// ── Settings commands ──

#[derive(serde::Serialize)]
pub struct SettingsResponse {
    pub autostart: bool,
    pub theme: String,
    pub launcher_size: String,
    pub widgets: crate::settings::WidgetsConfig,
    pub show_browser_tabs: bool,
}

#[tauri::command]
pub fn get_settings(manager: State<'_, SettingsManager>) -> SettingsResponse {
    // Read settings and release the mutex BEFORE calling is_autostart_enabled(),
    // which spawns a blocking subprocess (schtasks). Holding the lock during that
    // call blocks every other command that needs SettingsManager (e.g. search).
    let (theme, launcher_size, widgets, show_browser_tabs) = {
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
            s.widgets.clone(),
            s.show_browser_tabs,
        )
    };
    SettingsResponse {
        autostart: crate::settings::is_autostart_enabled(),
        theme,
        launcher_size,
        widgets,
        show_browser_tabs,
    }
}

#[tauri::command]
pub fn set_widgets_config(
    widgets: crate::settings::WidgetsConfig,
    manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    manager.inner.lock().unwrap().widgets = widgets;
    manager.save();
    Ok(())
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
pub fn set_show_browser_tabs(
    enabled: bool,
    manager: State<'_, SettingsManager>,
) -> Result<(), String> {
    manager.inner.lock().unwrap().show_browser_tabs = enabled;
    manager.save();
    Ok(())
}

#[tauri::command]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    println!("[autostart] set_autostart called with enabled={}", enabled);
    let result = crate::settings::set_autostart(enabled);
    println!("[autostart] result: {:?}", result);
    result
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
        // Only the width applies directly — height is content-driven and the
        // frontend re-reports it after the size change; just clamp to the new max.
        let scale = win.scale_factor().unwrap_or(1.0);
        let cur_h = win
            .outer_size()
            .map(|sz| sz.height as f64 / scale)
            .unwrap_or(h);
        let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(w, cur_h.min(h))));
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

/// Async so shell thumbnail extraction (disk I/O + decode, up to 10 per
/// result page) happens off the main thread.
#[tauri::command]
pub async fn get_file_thumbnail(path: String) -> Option<String> {
    crate::icons::extract_file_thumbnail(&path, 64)
}

// ── Pin commands ──

#[tauri::command]
pub fn is_pinned(state: State<'_, crate::window::PinState>) -> bool {
    state.is_pinned()
}

#[tauri::command]
pub fn toggle_pin(state: State<'_, crate::window::PinState>) -> bool {
    state.toggle()
}

#[tauri::command]
pub fn get_system_info(
    monitor: State<'_, crate::system_info::SystemMonitor>,
) -> crate::system_info::SystemInfo {
    monitor.sample()
}

// ── System dark mode (1×1 widget toggle) ──

/// Where Windows stores the personalization light/dark preference. The values
/// are DWORDs where 1 means light and 0 means dark; an absent value is light.
const PERSONALIZE_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize";

#[tauri::command]
pub fn get_system_dark_mode() -> Result<bool, String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(PERSONALIZE_KEY)
        .map_err(|e| e.to_string())?;
    let apps_use_light: u32 = key.get_value("AppsUseLightTheme").unwrap_or(1);
    Ok(apps_use_light == 0)
}

#[tauri::command]
pub fn set_system_dark_mode(dark: bool) -> Result<(), String> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_SET_VALUE};
    use winreg::RegKey;
    // Set both the app and system scopes so the taskbar and window frames follow,
    // matching what the Settings app does. 0 = dark, 1 = light.
    let value: u32 = if dark { 0 } else { 1 };
    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(PERSONALIZE_KEY, KEY_SET_VALUE)
        .map_err(|e| e.to_string())?;
    key.set_value("AppsUseLightTheme", &value)
        .map_err(|e| e.to_string())?;
    key.set_value("SystemUsesLightTheme", &value)
        .map_err(|e| e.to_string())?;
    broadcast_theme_change();
    Ok(())
}

/// Broadcast WM_SETTINGCHANGE("ImmersiveColorSet") so the shell and running
/// apps repaint with the new theme without requiring a sign-out.
fn broadcast_theme_change() {
    const HWND_BROADCAST: isize = 0xffff;
    const WM_SETTINGCHANGE: u32 = 0x001A;
    const SMTO_ABORTIFHUNG: u32 = 0x0002;
    #[link(name = "user32")]
    extern "system" {
        fn SendMessageTimeoutW(
            hwnd: isize,
            msg: u32,
            wp: usize,
            lp: isize,
            flags: u32,
            timeout: u32,
            result: *mut isize,
        ) -> isize;
    }
    let param: Vec<u16> = "ImmersiveColorSet\0".encode_utf16().collect();
    let mut result: isize = 0;
    unsafe {
        SendMessageTimeoutW(
            HWND_BROADCAST,
            WM_SETTINGCHANGE,
            0,
            param.as_ptr() as isize,
            SMTO_ABORTIFHUNG,
            100,
            &mut result,
        );
    }
}

