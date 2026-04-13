//! Index installed Steam games by parsing library manifests on disk.
//!
//! Reads `libraryfolders.vdf` to discover library paths, then parses
//! `appmanifest_*.acf` files for each installed game's metadata.
//! No Steam API or running Steam process required.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SteamGame {
    pub app_id: String,
    pub name: String,
    pub icon_data: String,
    pub last_played: u64,
}

pub struct SteamIndex {
    pub games: Mutex<Vec<SteamGame>>,
}

impl SteamIndex {
    pub fn new() -> Self {
        let games = load_games();
        println!("Steam: found {} installed games", games.len());
        Self {
            games: Mutex::new(games),
        }
    }
}

// ── Discovery ──

fn load_games() -> Vec<SteamGame> {
    let Some(steam_path) = find_steam_path() else {
        return Vec::new();
    };

    let library_paths = get_library_paths(&steam_path);
    let mut games = Vec::new();

    for lib_path in &library_paths {
        let steamapps = lib_path.join("steamapps");
        let Ok(entries) = std::fs::read_dir(&steamapps) else {
            continue;
        };

        for entry in entries.flatten() {
            let fname = entry.file_name();
            let fname = fname.to_string_lossy();
            if fname.starts_with("appmanifest_") && fname.ends_with(".acf") {
                if let Some(game) = parse_manifest(&entry.path(), &steam_path) {
                    games.push(game);
                }
            }
        }
    }

    games
}

fn find_steam_path() -> Option<PathBuf> {
    // Try registry
    if let Ok(hklm) = winreg::RegKey::predef(winreg::enums::HKEY_LOCAL_MACHINE)
        .open_subkey(r"SOFTWARE\WOW6432Node\Valve\Steam")
    {
        if let Ok(path) = hklm.get_value::<String, _>("InstallPath") {
            let p = PathBuf::from(&path);
            if p.exists() {
                return Some(p);
            }
        }
    }
    // Common fallbacks
    for path in [
        r"C:\Program Files (x86)\Steam",
        r"C:\Program Files\Steam",
    ] {
        let p = PathBuf::from(path);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

fn get_library_paths(steam_path: &Path) -> Vec<PathBuf> {
    let mut paths = vec![steam_path.to_path_buf()];

    let vdf = steam_path.join("config").join("libraryfolders.vdf");
    let Ok(content) = std::fs::read_to_string(&vdf) else {
        return paths;
    };

    for line in content.lines() {
        if let Some(value) = vdf_value(line, "path") {
            let lib = PathBuf::from(value.replace("\\\\", "\\"));
            if lib.exists() && !paths.contains(&lib) {
                paths.push(lib);
            }
        }
    }

    paths
}

// ── Manifest parsing ──

fn parse_manifest(path: &Path, steam_path: &Path) -> Option<SteamGame> {
    let content = std::fs::read_to_string(path).ok()?;

    let app_id = vdf_field(&content, "appid")?;
    let name = vdf_field(&content, "name")?;
    let state: u32 = vdf_field(&content, "StateFlags")?.parse().ok()?;
    let last_played: u64 = vdf_field(&content, "LastPlayed")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    // StateFlags 4 = fully installed
    if state != 4 || name.is_empty() {
        return None;
    }

    // Filter out tools / redistributables by app-id ranges and known names.
    if is_tool(&app_id, &name) {
        return None;
    }

    let icon_data = load_icon(steam_path, &app_id);

    Some(SteamGame {
        app_id,
        name,
        icon_data,
        last_played,
    })
}

/// Skip Steamworks redistributables, tools, and proton/compatibility layers.
fn is_tool(app_id: &str, name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("redistributable")
        || lower.contains("steamworks")
        || lower.contains("proton ")
        || lower.contains("steam linux runtime")
        || app_id == "228980" // Steamworks Common Redist
}

// ── Icons ──

fn load_icon(steam_path: &Path, app_id: &str) -> String {
    let cache_dir = steam_path
        .join("appcache")
        .join("librarycache")
        .join(app_id);

    // Prefer logo.png (small, transparent).
    let logo = cache_dir.join("logo.png");
    if let Ok(data) = std::fs::read(&logo) {
        return format!(
            "data:image/png;base64,{}",
            crate::icons::base64_encode(&data),
        );
    }

    // Fall back to the first .jpg in the cache directory.
    if let Ok(entries) = std::fs::read_dir(&cache_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            if name.to_string_lossy().ends_with(".jpg") {
                if let Ok(data) = std::fs::read(entry.path()) {
                    return format!(
                        "data:image/jpeg;base64,{}",
                        crate::icons::base64_encode(&data),
                    );
                }
            }
        }
    }

    String::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_steam_discovery() {
        let games = load_games();
        println!("Found {} Steam games:", games.len());
        for g in &games {
            let has_icon = if g.icon_data.is_empty() { "no icon" } else { "has icon" };
            println!("  [{}] {} ({})", g.app_id, g.name, has_icon);
        }
    }
}

// ── Minimal VDF helpers ──

/// Extract the value for a top-level key from VDF content.
fn vdf_field(content: &str, key: &str) -> Option<String> {
    for line in content.lines() {
        if let Some(v) = vdf_value(line, key) {
            return Some(v);
        }
    }
    None
}

/// Match a single VDF line: `"key"<tabs/spaces>"value"` → Some(value).
fn vdf_value(line: &str, key: &str) -> Option<String> {
    let t = line.trim();
    let prefix = format!("\"{}\"", key);
    if !t.starts_with(&prefix) {
        return None;
    }
    let rest = t[prefix.len()..].trim();
    if rest.starts_with('"') && rest.len() > 1 {
        let end = rest[1..].find('"')?;
        Some(rest[1..1 + end].to_string())
    } else {
        None
    }
}
