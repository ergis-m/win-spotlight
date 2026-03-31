use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::Serialize;

use crate::indexer::AppIndex;

#[derive(Clone, Serialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    /// PNG data URI (`data:image/png;base64,...`) or empty string.
    pub icon: String,
}

pub fn query(index: &AppIndex, query: &str, limit: usize) -> Vec<SearchResult> {
    let entries = index.entries.lock().unwrap();

    if query.is_empty() {
        return entries
            .iter()
            .take(limit)
            .map(|e| to_result(e))
            .collect();
    }

    let matcher = SkimMatcherV2::default();
    let mut scored: Vec<(i64, &crate::indexer::AppEntry)> = entries
        .iter()
        .filter_map(|entry| {
            matcher
                .fuzzy_match(&entry.name, query)
                .map(|score| (score, entry))
        })
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0));

    scored
        .into_iter()
        .take(limit)
        .map(|(_, e)| to_result(e))
        .collect()
}

fn to_result(e: &crate::indexer::AppEntry) -> SearchResult {
    SearchResult {
        id: e.id.clone(),
        title: e.name.clone(),
        subtitle: if e.group.is_empty() {
            "Application".into()
        } else {
            e.group.clone()
        },
        icon: e.icon_data.clone(),
    }
}
