use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use crate::settings::FileSearchSettings;

const CACHE_VERSION: u32 = 1;
const MAX_FILES: usize = 200_000;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub extension: String,
    pub modified_ts: i64,
}

pub struct FileIndex {
    pub entries: Mutex<Vec<FileEntry>>,
    pub ready: AtomicBool,
    pub last_indexed: AtomicI64,
}

#[derive(Clone, Serialize)]
pub struct FileIndexStatus {
    pub ready: bool,
    pub file_count: usize,
    pub last_indexed: i64,
}

impl FileIndex {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(Vec::new()),
            ready: AtomicBool::new(false),
            last_indexed: AtomicI64::new(0),
        }
    }

    pub fn status(&self) -> FileIndexStatus {
        FileIndexStatus {
            ready: self.ready.load(Ordering::SeqCst),
            file_count: self.entries.lock().unwrap().len(),
            last_indexed: self.last_indexed.load(Ordering::SeqCst),
        }
    }
}

fn cache_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("file_index.bin")
}

fn load_cache(app_data_dir: &Path) -> Option<Vec<FileEntry>> {
    let data = std::fs::read(cache_path(app_data_dir)).ok()?;
    if data.len() < 4 {
        return None;
    }
    let version = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
    if version != CACHE_VERSION {
        return None;
    }
    bincode::deserialize(&data[4..]).ok()
}

fn save_cache(entries: &[FileEntry], app_data_dir: &Path) {
    let mut data = CACHE_VERSION.to_le_bytes().to_vec();
    if let Ok(serialized) = bincode::serialize(entries) {
        data.extend(serialized);
        let _ = std::fs::write(cache_path(app_data_dir), data);
    }
}

fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

pub fn build_file_index(settings: &FileSearchSettings) -> Vec<FileEntry> {
    let excluded: std::collections::HashSet<String> =
        settings.excluded_dirs.iter().cloned().collect();
    let max_depth = settings.max_depth;
    let dirs: Vec<PathBuf> = settings.directories.iter().map(PathBuf::from).collect();
    let mut entries = Vec::new();

    for dir in &dirs {
        if !dir.exists() {
            continue;
        }

        let excluded = excluded.clone();
        let walker = jwalk::WalkDir::new(dir)
            .max_depth(max_depth)
            .skip_hidden(true)
            .process_read_dir(move |_depth, _path, _state, children| {
                children.retain(|entry| {
                    if let Ok(ref e) = entry {
                        if e.file_type().is_dir() {
                            let name = e.file_name().to_string_lossy().to_string();
                            return !excluded.contains(&name);
                        }
                    }
                    true
                });
            });

        for entry in walker {
            if entries.len() >= MAX_FILES {
                break;
            }
            let Ok(entry) = entry else { continue };
            if !entry.file_type().is_file() {
                continue;
            }

            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let extension = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            let modified_ts = entry
                .metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                extension,
                modified_ts,
            });
        }
    }

    entries
}

pub fn start_background_indexing(
    file_index: Arc<FileIndex>,
    app_data_dir: PathBuf,
    settings: FileSearchSettings,
) {
    if !settings.enabled {
        return;
    }

    std::thread::spawn(move || {
        // Step 1: Load cache for instant availability.
        if let Some(cached) = load_cache(&app_data_dir) {
            let count = cached.len();
            *file_index.entries.lock().unwrap() = cached;
            file_index.ready.store(true, Ordering::SeqCst);
            println!("File index: loaded {} files from cache", count);
        }

        // Step 2: Full scan to refresh the index.
        let start = Instant::now();
        let fresh = build_file_index(&settings);
        let count = fresh.len();
        let elapsed = start.elapsed().as_millis();

        // Step 3: Swap in fresh results and persist.
        *file_index.entries.lock().unwrap() = fresh.clone();
        file_index.ready.store(true, Ordering::SeqCst);
        file_index.last_indexed.store(now_ts(), Ordering::SeqCst);
        save_cache(&fresh, &app_data_dir);

        println!("File index: {} files in {}ms", count, elapsed);
    });
}

pub fn rebuild_index(
    file_index: Arc<FileIndex>,
    app_data_dir: PathBuf,
    settings: FileSearchSettings,
) {
    std::thread::spawn(move || {
        let start = Instant::now();
        let fresh = build_file_index(&settings);
        let count = fresh.len();
        let elapsed = start.elapsed().as_millis();

        *file_index.entries.lock().unwrap() = fresh.clone();
        file_index.ready.store(true, Ordering::SeqCst);
        file_index.last_indexed.store(now_ts(), Ordering::SeqCst);
        save_cache(&fresh, &app_data_dir);

        println!("File index rebuilt: {} files in {}ms", count, elapsed);
    });
}
