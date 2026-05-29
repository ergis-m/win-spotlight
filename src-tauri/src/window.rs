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

/// Work area (in logical pixels) of the monitor under the cursor, as
/// `(x, y, width, height)`. Uses `win`'s scale factor to convert from the
/// physical coordinates Windows reports.
fn cursor_monitor_work_area(win: &tauri::WebviewWindow) -> Option<(f64, f64, f64, f64)> {
    let mut cursor = POINT::default();
    unsafe { let _ = GetCursorPos(&mut cursor); }

    let monitor = unsafe { MonitorFromPoint(cursor, MONITOR_DEFAULTTONEAREST) };
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };

    let ok = unsafe { GetMonitorInfoW(monitor, &mut info) };
    if !ok.as_bool() {
        return None;
    }

    let scale = win.scale_factor().unwrap_or(1.0);
    let work = info.rcWork;
    Some((
        work.left as f64 / scale,
        work.top as f64 / scale,
        (work.right - work.left) as f64 / scale,
        (work.bottom - work.top) as f64 / scale,
    ))
}

/// Center the window on whichever monitor the cursor is currently on.
fn center_on_cursor_monitor(win: &tauri::WebviewWindow) {
    let Some((mon_x, mon_y, mon_w, mon_h)) = cursor_monitor_work_area(win) else {
        let _ = win.center();
        return;
    };

    let scale = win.scale_factor().unwrap_or(1.0);
    let win_size = win.outer_size().unwrap_or(tauri::PhysicalSize::new(800, 540));
    let win_w = win_size.width as f64 / scale;
    let win_h = win_size.height as f64 / scale;

    let x = mon_x + (mon_w - win_w) / 2.0;
    let y = mon_y + (mon_h - win_h) / 2.0;

    let _ = win.set_position(LogicalPosition::new(x, y));
}

/// Base (1×) settings window size in logical pixels. The window is shown at 2×
/// this, capped to 80% of the monitor's work area so it always fits.
const SETTINGS_BASE_SIZE: (f64, f64) = (800.0, 560.0);

/// Show the settings window, sized for the monitor it appears on.
///
/// Target size is 2× the base, capped at 80% of the work area of the monitor
/// under the cursor — so it's roomy on a large display but never overflows a
/// small one. Centers on that monitor and hides the launcher.
pub fn show_settings_window(app: &AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.hide();
    }

    if let Some(win) = app.get_webview_window("settings") {
        let mut target_w = SETTINGS_BASE_SIZE.0 * 2.0;
        let mut target_h = SETTINGS_BASE_SIZE.1 * 2.0;

        match cursor_monitor_work_area(&win) {
            Some((mon_x, mon_y, mon_w, mon_h)) => {
                target_w = target_w.min(mon_w * 0.8);
                target_h = target_h.min(mon_h * 0.8);
                let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(target_w, target_h)));
                let x = mon_x + (mon_w - target_w) / 2.0;
                let y = mon_y + (mon_h - target_h) / 2.0;
                let _ = win.set_position(LogicalPosition::new(x, y));
            }
            None => {
                let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(target_w, target_h)));
                let _ = win.center();
            }
        }

        let _ = win.show();
        let _ = win.set_focus();
    }
}
