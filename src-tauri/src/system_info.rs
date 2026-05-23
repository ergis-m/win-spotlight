//! CPU / RAM / disk stats for the launcher widgets row.

use std::sync::Mutex;

use serde::Serialize;
use sysinfo::{Disks, MemoryRefreshKind, RefreshKind, System};

#[derive(Serialize)]
pub struct DriveInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
}

#[derive(Serialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub drives: Vec<DriveInfo>,
}

pub struct SystemMonitor {
    sys: Mutex<System>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let sys = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(sysinfo::CpuRefreshKind::new().with_cpu_usage())
                .with_memory(MemoryRefreshKind::new().with_ram()),
        );
        Self { sys: Mutex::new(sys) }
    }

    pub fn sample(&self) -> SystemInfo {
        let mut sys = self.sys.lock().unwrap();
        sys.refresh_cpu_usage();
        sys.refresh_memory();

        let cpu_usage = sys.global_cpu_usage();
        let memory_used_bytes = sys.used_memory();
        let memory_total_bytes = sys.total_memory();

        let disks = Disks::new_with_refreshed_list();
        let drives = disks
            .iter()
            .map(|d| DriveInfo {
                name: d.name().to_string_lossy().into_owned(),
                mount_point: d.mount_point().to_string_lossy().into_owned(),
                total_bytes: d.total_space(),
                available_bytes: d.available_space(),
            })
            .collect();

        SystemInfo {
            cpu_usage,
            memory_used_bytes,
            memory_total_bytes,
            drives,
        }
    }
}
