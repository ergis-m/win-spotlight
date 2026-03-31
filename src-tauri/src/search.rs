use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::Serialize;

use crate::icons;
use crate::indexer::AppIndex;
use crate::running;
use crate::usage::UsageTracker;

#[derive(Clone, Serialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub icon: String,
    /// `"app"` or `"window"` — tells the frontend what kind of result this is.
    pub kind: String,
}

pub fn query(
    index: &AppIndex,
    tracker: &UsageTracker,
    query: &str,
    limit: usize,
) -> Vec<SearchResult> {
    let windows = running::get_windows();

    if query.is_empty() {
        return default_results(index, tracker, &windows, limit);
    }

    let matcher = SkimMatcherV2::default();
    let mut scored: Vec<(i64, SearchResult)> = Vec::new();

    // Score running windows (boost +30 for being active).
    for win in &windows {
        if let Some(score) = matcher.fuzzy_match(&win.title, query) {
            scored.push((
                score + 30,
                window_result(win),
            ));
        }
    }

    // Score indexed apps (boost by usage).
    let entries = index.entries.lock().unwrap();
    for entry in entries.iter() {
        if let Some(score) = matcher.fuzzy_match(&entry.name, query) {
            let usage_boost = (tracker.get_count(&entry.id) as i64).min(50) * 2;
            scored.push((score + usage_boost, app_result(entry)));
        }
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
