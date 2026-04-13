use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::Serialize;

use crate::browser_tabs;
use crate::file_indexer::FileIndex;
use crate::file_search;
use crate::icons;
use crate::indexer::AppIndex;
use crate::running;
use crate::steam::SteamIndex;
use crate::settings::SettingsManager;
use crate::usage::UsageTracker;

#[derive(Clone, Serialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub icon: String,
    /// `"app"`, `"window"`, `"file"`, or `"url"` — tells the frontend what kind of result this is.
    pub kind: String,
}

pub fn query(
    index: &AppIndex,
    file_index: &FileIndex,
    steam_index: &SteamIndex,
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

    // Enumerate browser tabs once — used for both tab count on windows and
    // individual tab search results.
    let tabs = if include_apps {
        browser_tabs::get_browser_tabs(&windows)
    } else {
        Vec::new()
    };
    let tab_counts = tab_count_map(&tabs);

    if query.is_empty() && include_apps {
        return default_results(index, tracker, &windows, &tabs, &tab_counts, limit);
    }

    if query.is_empty() {
        return Vec::new();
    }

    // If the query looks like a URL, offer to open it directly.
    if let Some(url_result) = url_result(query) {
        return vec![url_result];
    }

    let matcher = SkimMatcherV2::default();
    let mut scored: Vec<(i64, SearchResult)> = Vec::new();

    let query_lower = query.to_lowercase();

    // Running windows and tabs get a boost so they rank above static files
    // at similar match quality — the user is more likely switching to an
    // already-open item than opening a file.
    const RUNNING_BOOST: i64 = 80;

    if include_apps {
        for win in &windows {
            // Skip browser windows when we have their individual tabs —
            // the tabs are more useful and the window just duplicates the
            // active tab.
            let tc = tab_counts.get(&win.hwnd).copied().unwrap_or(0);
            if tc > 0 {
                continue;
            }

            let exe_name = std::path::Path::new(&win.exe_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            let title_score = matcher.fuzzy_match(&win.title, query);
            let exe_score = matcher.fuzzy_match(exe_name, query);
            let best = match (title_score, exe_score) {
                (Some(a), Some(b)) => Some(a.max(b)),
                (a, None) => a,
                (None, b) => b,
            };
            if let Some(score) = best {
                let prefix = prefix_bonus(exe_name, &query_lower);
                let min_score = query.len() as i64 * 15;
                if score + prefix < min_score {
                    continue;
                }
                scored.push((score + prefix + RUNNING_BOOST, window_result(win, 0)));
            }
        }

        // Score individual browser tabs.
        for tab in &tabs {
            if let Some(score) = matcher.fuzzy_match(&tab.title, query) {
                let prefix = prefix_bonus(&tab.title, &query_lower);
                let min_score = query.len() as i64 * 15;
                if score + prefix < min_score {
                    continue;
                }
                scored.push((score + prefix + RUNNING_BOOST, tab_result(tab)));
            }
        }

        // Score indexed apps (boost by usage and prefix match).
        let entries = index.entries.lock().unwrap();
        for entry in entries.iter() {
            if let Some(score) = matcher.fuzzy_match(&entry.name, query) {
                let usage_boost = (tracker.get_count(&entry.id) as i64).min(50) * 2;
                let prefix_boost = prefix_bonus(&entry.name, &query_lower);
                scored.push((score + usage_boost + prefix_boost, app_result(entry)));
            }
        }

        // Score installed Steam games.
        let games = steam_index.games.lock().unwrap();
        for game in games.iter() {
            if let Some(score) = matcher.fuzzy_match(&game.name, query) {
                let prefix = prefix_bonus(&game.name, &query_lower);
                scored.push((score + prefix, game_result(game)));
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
/// Browser windows with tabs are replaced by their individual tabs.
fn default_results(
    index: &AppIndex,
    tracker: &UsageTracker,
    windows: &[running::RunningWindow],
    tabs: &[browser_tabs::BrowserTab],
    tab_counts: &std::collections::HashMap<isize, usize>,
    limit: usize,
) -> Vec<SearchResult> {
    let mut results: Vec<SearchResult> = Vec::new();
    for win in windows {
        if results.len() >= limit {
            break;
        }
        if tab_counts.get(&win.hwnd).copied().unwrap_or(0) > 0 {
            // Replace the browser window with its individual tabs.
            for tab in tabs.iter().filter(|t| t.window_hwnd == win.hwnd) {
                if results.len() >= limit {
                    break;
                }
                results.push(tab_result(tab));
            }
        } else {
            results.push(window_result(win, 0));
        }
    }

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

fn tab_count_map(tabs: &[browser_tabs::BrowserTab]) -> std::collections::HashMap<isize, usize> {
    let mut counts = std::collections::HashMap::new();
    for tab in tabs {
        *counts.entry(tab.window_hwnd).or_insert(0) += 1;
    }
    counts
}

fn window_result(win: &running::RunningWindow, tab_count: usize) -> SearchResult {
    let exe_name = std::path::Path::new(&win.exe_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("App");

    let subtitle = if tab_count > 1 {
        format!("Running · {} · {} tabs", exe_name, tab_count)
    } else {
        format!("Running · {}", exe_name)
    };

    SearchResult {
        id: format!("window:{}", win.hwnd),
        title: win.title.clone(),
        subtitle,
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

/// Detect URL-like input and return a launchable result.
fn url_result(query: &str) -> Option<SearchResult> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return None;
    }

    let is_url = trimmed.starts_with("http://")
        || trimmed.starts_with("https://")
        || (trimmed.contains('.') && !trimmed.contains(' ') && !trimmed.starts_with('.'));

    if !is_url {
        return None;
    }

    let url = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    };

    Some(SearchResult {
        id: format!("url:{}", url),
        title: trimmed.to_string(),
        subtitle: format!("Open {}", url),
        icon: String::new(),
        kind: "url".into(),
    })
}

fn tab_result(tab: &browser_tabs::BrowserTab) -> SearchResult {
    let exe_name = std::path::Path::new(&tab.exe_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Browser");

    SearchResult {
        id: format!("tab:{}:{}", tab.window_hwnd, tab.title),
        title: tab.title.clone(),
        subtitle: format!("Tab · {}", exe_name),
        icon: icons::extract_icon_data_uri(&tab.exe_path).unwrap_or_default(),
        kind: "tab".into(),
    }
}

fn game_result(game: &crate::steam::SteamGame) -> SearchResult {
    SearchResult {
        id: format!("steam:{}", game.app_id),
        title: game.name.clone(),
        subtitle: "Steam Game".into(),
        icon: game.icon_data.clone(),
        kind: "game".into(),
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
