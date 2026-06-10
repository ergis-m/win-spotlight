//! On-demand icon resolution for search results. Search responses no longer
//! embed icon data — the frontend requests an icon by result id (like a
//! `/icon/<id>` resource) and caches the response for the session.

use std::collections::HashMap;
use std::sync::Mutex;

use crate::icons;
use crate::indexer::AppIndex;
use crate::running;
use crate::steam::SteamIndex;

pub struct IconCache {
    /// Extracted window/tab icons keyed by exe path, so every window and tab
    /// of the same app shares one extraction.
    by_exe: Mutex<HashMap<String, String>>,
}

impl IconCache {
    pub fn new() -> Self {
        Self {
            by_exe: Mutex::new(HashMap::new()),
        }
    }

    /// Resolve the icon for a search result id (`window:<hwnd>`,
    /// `tab:<hwnd>:<title>`, `steam:<app_id>`, or an app slug) as a PNG data URI.
    pub fn resolve(&self, id: &str, index: &AppIndex, steam_index: &SteamIndex) -> Option<String> {
        if let Some(hwnd_str) = id.strip_prefix("window:") {
            let hwnd: isize = hwnd_str.parse().ok()?;
            let exe_path = exe_path_for_hwnd(hwnd)?;
            return self.get_or_extract(&exe_path, || icons::extract_window_icon(hwnd, &exe_path));
        }

        if let Some(rest) = id.strip_prefix("tab:") {
            let hwnd: isize = rest.split(':').next()?.parse().ok()?;
            let exe_path = exe_path_for_hwnd(hwnd)?;
            return self.get_or_extract(&exe_path, || icons::extract_icon_data_uri(&exe_path));
        }

        if let Some(app_id) = id.strip_prefix("steam:") {
            let games = steam_index.games.lock().unwrap();
            return games
                .iter()
                .find(|g| g.app_id == app_id)
                .map(|g| g.icon_data.clone())
                .filter(|icon| !icon.is_empty());
        }

        let entries = index.entries.lock().unwrap();
        entries
            .iter()
            .find(|e| e.id == id)
            .map(|e| e.icon_data.clone())
            .filter(|icon| !icon.is_empty())
    }

    /// Failures aren't cached so a transient extraction failure (e.g. a hung
    /// window not answering WM_GETICON) can recover on a later request.
    fn get_or_extract(
        &self,
        exe_path: &str,
        extract: impl FnOnce() -> Option<String>,
    ) -> Option<String> {
        if let Some(icon) = self.by_exe.lock().unwrap().get(exe_path) {
            return Some(icon.clone());
        }
        let icon = extract()?;
        self.by_exe
            .lock()
            .unwrap()
            .insert(exe_path.to_string(), icon.clone());
        Some(icon)
    }
}

fn exe_path_for_hwnd(hwnd: isize) -> Option<String> {
    running::get_windows()
        .into_iter()
        .find(|w| w.hwnd == hwnd)
        .map(|w| w.exe_path)
}
