use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::Serialize;

use crate::file_indexer::FileIndex;
use crate::file_search;
use crate::icons;
use crate::indexer::AppIndex;
use crate::running;
use crate::settings::SettingsManager;
use crate::usage::UsageTracker;

#[derive(Clone, Serialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub icon: String,
    /// `"app"`, `"window"`, or `"file"` — tells the frontend what kind of result this is.
    pub kind: String,
}

pub fn query(
    index: &AppIndex,
    file_index: &FileIndex,
    tracker: &UsageTracker,
    settings_mgr: &SettingsManager,
    query: &str,
    mode: &str,
    limit: usize,
) -> Vec<SearchResult> {
    let windows = running::get_windows();
    let file_search_enabled = settings_mgr.inner.lock().unwrap().file_search.enabled;
    let include_apps = mode == "all" || mode == "apps";
    let include_files = file_search_enabled && (mode == "all" || mode == "files");
    let include_media = file_search_enabled && mode == "media";

    if query.is_empty() && include_apps {
        return default_results(index, tracker, &windows, limit);
    }

    if query.is_empty() {
        return Vec::new();
    }

    let matcher = SkimMatcherV2::default();
    let mut scored: Vec<(i64, SearchResult)> = Vec::new();

    if include_apps {
        // Score running windows (boost +30 for being active).
        for win in &windows {
            if let Some(score) = matcher.fuzzy_match(&win.title, query) {
                scored.push((
                    score + 30,
                    window_result(win),
                ));
            }
        }

        // Score indexed apps (boost by usage and prefix match).
        let query_lower = query.to_lowercase();
        let entries = index.entries.lock().unwrap();
        for entry in entries.iter() {
            if let Some(score) = matcher.fuzzy_match(&entry.name, query) {
                let usage_boost = (tracker.get_count(&entry.id) as i64).min(50) * 2;
                let prefix_boost = prefix_bonus(&entry.name, &query_lower);
                scored.push((score + usage_boost + prefix_boost, app_result(entry)));
            }
        }
    }

    if include_files || include_media {
        let file_limit = if mode == "all" { 5 } else { limit };
        let skip_min = mode != "all";
        let file_results = file_search::query_files(
            file_index, tracker, query, file_limit, include_media, skip_min,
        );
        scored.extend(file_results);
    }

    scored.sort_by(|a, b| b.0.cmp(&a.0));
    scored.into_iter().take(limit).map(|(_, r)| r).collect()
}

/// Empty-query view: running windows first, then most-used apps.
fn default_results(
    index: &AppIndex,
    tracker: &UsageTracker,
    windows: &[running::RunningWindow],
    limit: usize,
) -> Vec<SearchResult> {
    let mut results: Vec<SearchResult> = windows
        .iter()
        .take(limit)
        .map(window_result)
        .collect();

    let remaining = limit.saturating_sub(results.len());
    if remaining > 0 {
        let entries = index.entries.lock().unwrap();
        let top_ids = tracker.top_ids(remaining + 10);

        for id in &top_ids {
            if results.len() >= limit {
                break;
            }
            if let Some(e) = entries.iter().find(|e| &e.id == id) {
                results.push(app_result(e));
            }
        }

        // If we still have room, fill with alphabetical apps.
        if results.len() < limit {
            let used: std::collections::HashSet<String> =
                results.iter().map(|r| r.id.clone()).collect();
            for e in entries.iter() {
                if results.len() >= limit {
                    break;
                }
                if !used.contains(&e.id) {
                    results.push(app_result(e));
                }
            }
        }
    }

    results
}

fn window_result(win: &running::RunningWindow) -> SearchResult {
    let exe_name = std::path::Path::new(&win.exe_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("App");

    SearchResult {
        id: format!("window:{}", win.hwnd),
        title: win.title.clone(),
        subtitle: format!("Running · {}", exe_name),
        icon: icons::extract_window_icon(win.hwnd, &win.exe_path).unwrap_or_default(),
        kind: "window".into(),
    }
}

/// Boost apps whose name starts with the query or is an exact match.
/// Short-named apps that prefix-match get an extra bump so "ea" → "EA" beats
/// random fuzzy hits like "Notepad".
fn prefix_bonus(name: &str, query_lower: &str) -> i64 {
    let name_lower = name.to_lowercase();
    if name_lower == *query_lower {
        return 200; // exact match
    }
    if name_lower.starts_with(query_lower) {
        // Shorter names get a bigger boost (e.g. "EA" > "EarTrumpet").
        let len_bonus = 60i64.saturating_sub(name.len() as i64 * 3);
        return 100 + len_bonus.max(0);
    }
    0
}

fn app_result(e: &crate::indexer::AppEntry) -> SearchResult {
    SearchResult {
        id: e.id.clone(),
        title: e.name.clone(),
        subtitle: if e.group.is_empty() {
            "Application".into()
        } else {
            e.group.clone()
        },
        icon: e.icon_data.clone(),
        kind: "app".into(),
    }
}
