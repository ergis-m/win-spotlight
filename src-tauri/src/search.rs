use fuzzy_matcher::skim::SkimMatcherV2;
use fuzzy_matcher::FuzzyMatcher;
use serde::Serialize;

/// Represents an item that can appear in search results.
#[derive(Clone, Serialize)]
pub struct SearchItem {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub icon: String,
    pub action: ItemAction,
}

/// What happens when a search item is activated.
#[derive(Clone, Serialize)]
#[serde(tag = "type", content = "value")]
pub enum ItemAction {
    OpenUrl(String),
    RunCommand(String),
    Copy(String),
}

/// Performs fuzzy search over the item catalog and returns ranked results.
pub fn fuzzy_search(query: &str, items: &[SearchItem], limit: usize) -> Vec<SearchItem> {
    if query.is_empty() {
        return items.iter().take(limit).cloned().collect();
    }

    let matcher = SkimMatcherV2::default();
    let mut scored: Vec<(i64, &SearchItem)> = items
        .iter()
        .filter_map(|item| {
            matcher
                .fuzzy_match(&item.title, query)
                .map(|score| (score, item))
        })
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0));
    scored.into_iter().take(limit).map(|(_, item)| item.clone()).collect()
}

/// Returns the built-in item catalog.
/// In a real app, this would load from plugins, file system indexing, etc.
pub fn get_catalog() -> Vec<SearchItem> {
    vec![
        SearchItem {
            id: "calc".into(),
            title: "Calculator".into(),
            subtitle: "Open Windows Calculator".into(),
            icon: "calculator".into(),
            action: ItemAction::RunCommand("calc".into()),
        },
        SearchItem {
            id: "notepad".into(),
            title: "Notepad".into(),
            subtitle: "Open Notepad".into(),
            icon: "notepad".into(),
            action: ItemAction::RunCommand("notepad".into()),
        },
        SearchItem {
            id: "terminal".into(),
            title: "Terminal".into(),
            subtitle: "Open Windows Terminal".into(),
            icon: "terminal".into(),
            action: ItemAction::RunCommand("wt".into()),
        },
        SearchItem {
            id: "explorer".into(),
            title: "File Explorer".into(),
            subtitle: "Open File Explorer".into(),
            icon: "folder".into(),
            action: ItemAction::RunCommand("explorer".into()),
        },
        SearchItem {
            id: "settings".into(),
            title: "Settings".into(),
            subtitle: "Open Windows Settings".into(),
            icon: "settings".into(),
            action: ItemAction::RunCommand("ms-settings:".into()),
        },
        SearchItem {
            id: "taskmgr".into(),
            title: "Task Manager".into(),
            subtitle: "Open Task Manager".into(),
            icon: "activity".into(),
            action: ItemAction::RunCommand("taskmgr".into()),
        },
    ]
}
