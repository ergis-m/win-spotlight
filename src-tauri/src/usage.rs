//! Track app launch frequency. Persisted to a JSON file in %APPDATA%.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct UsageTracker {
    counts: Mutex<HashMap<String, u64>>,
    path: PathBuf,
}

impl UsageTracker {
    pub fn new() -> Self {
        let path = storage_path();
        let counts = std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        Self {
            counts: Mutex::new(counts),
            path,
        }
    }

    /// Increment the launch count for an app and persist.
    pub fn record(&self, app_id: &str) {
        let mut counts = self.counts.lock().unwrap();
        *counts.entry(app_id.to_string()).or_insert(0) += 1;
        if let Ok(json) = serde_json::to_string(&*counts) {
            let _ = std::fs::write(&self.path, json);
        }
    }

    pub fn get_count(&self, app_id: &str) -> u64 {
        self.counts.lock().unwrap().get(app_id).copied().unwrap_or(0)
    }

    /// Return the top N most-launched app IDs.
    pub fn top_ids(&self, limit: usize) -> Vec<String> {
        let counts = self.counts.lock().unwrap();
        let mut sorted: Vec<_> = counts.iter().collect();
        sorted.sort_by(|a, b| b.1.cmp(a.1));
        sorted.into_iter().take(limit).map(|(k, _)| k.clone()).collect()
    }
}

fn storage_path() -> PathBuf {
    let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    let dir = PathBuf::from(base).join("com.winapp.launcher");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("usage.json")
}
