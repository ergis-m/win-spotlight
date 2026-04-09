use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Manager, LogicalPosition};
use windows::Win32::Foundation::POINT;
use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

/// Runtime pin state — not persisted across restarts.
pub struct PinState(pub AtomicBool);

impl PinState {
    pub fn new() -> Self {
        Self(AtomicBool::new(false))
    }

    pub fn is_pinned(&self) -> bool {
        self.0.load(Ordering::Relaxed)
    }

    pub fn toggle(&self) -> bool {
        let was = self.0.fetch_xor(true, Ordering::Relaxed);
        !was
    }
}

/// Toggle the main launcher window visibility.
/// Centers on the monitor where the cursor is located (unless pinned).
pub fn toggle_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let pinned = app.state::<PinState>().is_pinned();
            if !pinned {
                center_on_cursor_monitor(&win);
            }
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

/// Center the window on whichever monitor the cursor is currently on.
fn center_on_cursor_monitor(win: &tauri::WebviewWindow) {
    let mut cursor = POINT::default();
    unsafe { let _ = GetCursorPos(&mut cursor); }

    let monitor = unsafe { MonitorFromPoint(cursor, MONITOR_DEFAULTTONEAREST) };
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };

    let ok = unsafe { GetMonitorInfoW(monitor, &mut info) };
    if !ok.as_bool() {
        let _ = win.center();
        return;
    }

    let scale = win.scale_factor().unwrap_or(1.0);
    let work = info.rcWork;
    let mon_x = work.left as f64 / scale;
    let mon_y = work.top as f64 / scale;
    let mon_w = (work.right - work.left) as f64 / scale;
    let mon_h = (work.bottom - work.top) as f64 / scale;

    let win_size = win.outer_size().unwrap_or(tauri::PhysicalSize::new(640, 420));
    let win_w = win_size.width as f64 / scale;
    let win_h = win_size.height as f64 / scale;

    let x = mon_x + (mon_w - win_w) / 2.0;
    let y = mon_y + (mon_h - win_h) / 2.0;

    let _ = win.set_position(LogicalPosition::new(x, y));
}
