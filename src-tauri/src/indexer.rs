use std::collections::HashMap;
use std::ffi::OsStr;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::icons;

// ── Data model ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    pub group: String,
    /// For .lnk apps: the shortcut path. Empty for UWP apps.
    pub shortcut_path: String,
    /// For UWP apps: the AppUserModelId. Empty for .lnk apps.
    pub app_user_model_id: String,
    /// Base64 PNG data URI, or empty string.
    pub icon_data: String,
}

pub struct AppIndex {
    pub entries: Mutex<Vec<AppEntry>>,
}

impl AppIndex {
    /// Create an AppIndex, loading from cache if available (fast path).
    /// The full rebuild happens in the background via `start_background_rebuild`.
    pub fn new(cache_dir: &Path) -> Self {
        let entries = load_cache(cache_dir).unwrap_or_default();
        Self {
            entries: Mutex::new(entries),
        }
    }

    /// Spawn a background thread that rebuilds the full index and updates
    /// both the in-memory entries and the on-disk cache.
    pub fn start_background_rebuild(self: &std::sync::Arc<Self>, cache_dir: PathBuf) {
        let index = std::sync::Arc::clone(self);
        std::thread::spawn(move || {
            let fresh = build_index();
            save_cache(&cache_dir, &fresh);
            *index.entries.lock().unwrap() = fresh;
            println!("App index rebuilt in background");
        });
    }
}

fn cache_path(cache_dir: &Path) -> PathBuf {
    cache_dir.join("app_index.bin")
}

fn load_cache(cache_dir: &Path) -> Option<Vec<AppEntry>> {
    let data = std::fs::read(cache_path(cache_dir)).ok()?;
    bincode::deserialize(&data).ok()
}

fn save_cache(cache_dir: &Path, entries: &[AppEntry]) {
    if let Ok(data) = bincode::serialize(entries) {
        let _ = std::fs::write(cache_path(cache_dir), data);
    }
}

// ── Index builder ──

fn build_index() -> Vec<AppEntry> {
    let mut entries = Vec::new();
    let mut seen: HashMap<String, usize> = HashMap::new();

    // Source 1: Start Menu .lnk files (system-wide + per-user)
    for dir in start_menu_dirs() {
        collect_lnk_files(&dir, &dir, &mut entries, &mut seen);
    }

    // Source 2: Desktop shortcuts
    for dir in desktop_dirs() {
        collect_lnk_files(&dir, &dir, &mut entries, &mut seen);
    }

    // Source 3: UWP / Store apps via PowerShell Get-StartApps
    collect_uwp_apps(&mut entries, &mut seen);

    entries.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    entries
}

fn start_menu_dirs() -> Vec<std::path::PathBuf> {
    let mut dirs = Vec::new();
    if let Ok(v) = std::env::var("ProgramData") {
        dirs.push(Path::new(&v).join("Microsoft\\Windows\\Start Menu\\Programs"));
    }
    if let Ok(v) = std::env::var("APPDATA") {
        dirs.push(Path::new(&v).join("Microsoft\\Windows\\Start Menu\\Programs"));
    }
    dirs
}

fn desktop_dirs() -> Vec<std::path::PathBuf> {
    let mut dirs = Vec::new();
    if let Ok(v) = std::env::var("USERPROFILE") {
        dirs.push(Path::new(&v).join("Desktop"));
    }
    if let Ok(v) = std::env::var("PUBLIC") {
        dirs.push(Path::new(&v).join("Desktop"));
    }
    dirs
}

// ── .lnk file scanner ──

const FILTER_WORDS: &[&str] = &[
    "uninstall", "readme", "read me", "license", "changelog",
    "release notes", "help", "documentation", "website",
    "manual", "guide", "what's new",
];

fn collect_lnk_files(
    dir: &Path,
    root: &Path,
    entries: &mut Vec<AppEntry>,
    seen: &mut HashMap<String, usize>,
) {
    let read_dir = match std::fs::read_dir(dir) {
        Ok(rd) => rd,
        Err(_) => return,
    };

    for entry in read_dir.flatten() {
        let path = entry.path();

        if path.is_dir() {
            collect_lnk_files(&path, root, entries, seen);
            continue;
        }

        if path.extension().and_then(OsStr::to_str) != Some("lnk") {
            continue;
        }

        let name = match path.file_stem().and_then(OsStr::to_str) {
            Some(n) => n.to_string(),
            None => continue,
        };

        let name_lower = name.to_lowercase();
        if FILTER_WORDS.iter().any(|w| name_lower.contains(w)) {
            continue;
        }

        let group = path
            .parent()
            .and_then(|p| p.strip_prefix(root).ok())
            .and_then(|rel| rel.to_str())
            .unwrap_or("")
            .to_string();

        let id = slug(&name);
        let shortcut_path = path.to_string_lossy().into_owned();

        if let Some(&idx) = seen.get(&id) {
            if group.is_empty() && !entries[idx].group.is_empty() {
                let icon_data = icons::extract_icon_data_uri(&shortcut_path).unwrap_or_default();
                entries[idx] = AppEntry {
                    id: id.clone(),
                    name: name.clone(),
                    group,
                    shortcut_path,
                    app_user_model_id: String::new(),
                    icon_data,
                };
            }
            continue;
        }

        let icon_data = icons::extract_icon_data_uri(&shortcut_path).unwrap_or_default();

        seen.insert(id.clone(), entries.len());
        entries.push(AppEntry {
            id,
            name,
            group,
            shortcut_path,
            app_user_model_id: String::new(),
            icon_data,
        });
    }
}

// ── UWP app discovery via PowerShell ──

#[derive(Deserialize)]
struct StartApp {
    #[serde(alias = "Name")]
    name: String,
    #[serde(alias = "AppID")]
    app_id: String,
}

fn collect_uwp_apps(entries: &mut Vec<AppEntry>, seen: &mut HashMap<String, usize>) {
    let output = match std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-NoLogo",
            "-Command",
            "Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress",
        ])
        .creation_flags(0x08000000)
        .output()
    {
        Ok(o) if o.status.success() => o.stdout,
        _ => return,
    };

    let text = String::from_utf8_lossy(&output);

    // PowerShell returns an object (not array) when there's only one result.
    let apps: Vec<StartApp> = serde_json::from_str(&text)
        .or_else(|_| serde_json::from_str::<StartApp>(&text).map(|a| vec![a]))
        .unwrap_or_default();

    for app in apps {
        // Skip non-UWP entries — those are .lnk apps we already indexed.
        if !app.app_id.contains('!') {
            continue;
        }

        let id = slug(&app.name);
        if seen.contains_key(&id) {
            continue;
        }

        // Try COM icon extraction; fall back to empty (letter initial in UI).
        let icon_data = icons::extract_uwp_icon_data_uri(&app.app_id).unwrap_or_default();

        seen.insert(id.clone(), entries.len());
        entries.push(AppEntry {
            id,
            name: app.name,
            group: "Store App".into(),
            shortcut_path: String::new(),
            app_user_model_id: app.app_id,
            icon_data,
        });
    }
}

// ── Helpers ──

fn slug(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
