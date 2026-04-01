use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;

use crate::file_indexer::FileIndex;
use crate::search::SearchResult;
use crate::usage::UsageTracker;

/// Common document/media extensions get a relevance boost.
const DOC_EXTENSIONS: &[&str] = &[
    "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "txt", "md", "csv", "jpg", "jpeg",
    "png", "gif", "svg", "mp3", "mp4", "zip", "rar",
];

/// Source code extensions get a smaller boost.
const CODE_EXTENSIONS: &[&str] = &[
    "rs", "ts", "tsx", "js", "jsx", "py", "go", "java", "c", "cpp", "h", "cs", "rb", "swift",
    "kt", "toml", "yaml", "yml", "json", "html", "css", "scss",
];

/// Media extensions for the Media tab filter.
const MEDIA_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico", "tiff", "tif",
    "mp4", "mkv", "avi", "mov", "webm", "wmv", "flv",
    "mp3", "wav", "flac", "ogg", "aac", "wma", "m4a",
];

pub fn query_files(
    file_index: &FileIndex,
    tracker: &UsageTracker,
    query: &str,
    limit: usize,
    media_only: bool,
    skip_min_length: bool,
) -> Vec<(i64, SearchResult)> {
    if !file_index.ready.load(Ordering::SeqCst) {
        return Vec::new();
    }

    // In "all" mode, require at least 3 chars. In dedicated file/media tabs, allow shorter.
    if !skip_min_length && query.len() < 3 {
        return Vec::new();
    }

    let matcher = SkimMatcherV2::default();
    let query_lower = query.to_lowercase();
    let now_ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let entries = file_index.entries.lock().unwrap();
    let mut scored: Vec<(i64, SearchResult)> = Vec::new();

    for entry in entries.iter() {
        // Media filter: skip non-media files when in media mode.
        if media_only && !MEDIA_EXTENSIONS.contains(&entry.extension.as_str()) {
            continue;
        }

        let Some(score) = matcher.fuzzy_match(&entry.name, query) else {
            continue;
        };

        // Recency boost.
        let age_days = (now_ts - entry.modified_ts) / 86400;
        let recency_boost = if age_days < 7 {
            20
        } else if age_days < 30 {
            10
        } else {
            0
        };

        // Extension boost.
        let ext_boost = if DOC_EXTENSIONS.contains(&entry.extension.as_str()) {
            15
        } else if CODE_EXTENSIONS.contains(&entry.extension.as_str()) {
            10
        } else {
            0
        };

        // Path depth penalty (prefer shallower files).
        let depth = entry.path.matches(['\\', '/']).count();
        let depth_penalty = (depth as i64).saturating_sub(4);

        // Prefix bonus (same logic as app search).
        let name_lower = entry.name.to_lowercase();
        let prefix_boost = if name_lower == query_lower {
            200
        } else if name_lower.starts_with(&query_lower) {
            let len_bonus = 60i64.saturating_sub(entry.name.len() as i64 * 3);
            100 + len_bonus.max(0)
        } else {
            0
        };

        // Usage boost for previously opened files.
        let file_id = format!("file:{}", entry.path);
        let usage_boost = (tracker.get_count(&file_id) as i64).min(50) * 2;

        let total = score + recency_boost + ext_boost + prefix_boost + usage_boost - depth_penalty;

        // Abbreviate the parent directory for the subtitle.
        let subtitle = std::path::Path::new(&entry.path)
            .parent()
            .map(|p| {
                let s = p.to_string_lossy().to_string();
                if let Ok(home) = std::env::var("USERPROFILE") {
                    if let Some(rest) = s.strip_prefix(&home) {
                        return format!("~{}", rest);
                    }
                }
                s
            })
            .unwrap_or_default();

        scored.push((
            total,
            SearchResult {
                id: file_id,
                title: entry.name.clone(),
                subtitle,
                icon: String::new(),
                kind: "file".into(),
            },
        ));
    }

    scored.sort_by(|a, b| b.0.cmp(&a.0));
    scored.into_iter().take(limit).collect()
}
