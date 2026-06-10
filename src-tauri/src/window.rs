use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager, LogicalPosition};
use windows::Win32::Foundation::POINT;
use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

use crate::settings::SettingsManager;

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

/// Spring state for the launcher window height. The frontend reports its
/// content height via `set_launcher_height`; the window is animated to match
/// so the native acrylic backdrop always hugs the visible panel.
pub struct HeightAnimator {
    target: Mutex<f64>,
    velocity: Mutex<f64>,
    /// Bumped on every retarget; a running animation thread exits when it no
    /// longer owns the latest generation.
    generation: AtomicU64,
}

impl HeightAnimator {
    pub fn new() -> Self {
        Self {
            target: Mutex::new(0.0),
            velocity: Mutex::new(0.0),
            generation: AtomicU64::new(0),
        }
    }
}

const SPRING_STIFFNESS: f64 = 500.0;
const SPRING_DAMPING: f64 = 40.0;
const TICK: Duration = Duration::from_millis(8);

fn logical_size(win: &tauri::WebviewWindow) -> (f64, f64) {
    let scale = win.scale_factor().unwrap_or(1.0);
    let size = win.outer_size().unwrap_or(tauri::PhysicalSize::new(800, 540));
    (size.width as f64 / scale, size.height as f64 / scale)
}

/// Animate the launcher window height to `target` (logical px) with a spring.
/// Snaps instantly while the window is hidden so it reopens already settled.
pub fn animate_height(app: &AppHandle, target: f64) {
    let Some(win) = app.get_webview_window("main") else { return };
    let animator = app.state::<HeightAnimator>();
    *animator.target.lock().unwrap() = target;
    let gen = animator.generation.fetch_add(1, Ordering::SeqCst) + 1;

    let (cur_w, cur_h) = logical_size(&win);
    if (cur_h - target).abs() < 1.0 {
        return;
    }

    if !win.is_visible().unwrap_or(false) {
        *animator.velocity.lock().unwrap() = 0.0;
        let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(cur_w, target)));
        return;
    }

    let app = app.clone();
    std::thread::spawn(move || {
        let animator = app.state::<HeightAnimator>();
        let Some(win) = app.get_webview_window("main") else { return };
        let mut pos = cur_h;
        // Carry velocity over from the animation this one supersedes, so
        // retargeting mid-flight stays smooth.
        let mut vel = *animator.velocity.lock().unwrap();
        let mut last = Instant::now();

        loop {
            std::thread::sleep(TICK);
            if animator.generation.load(Ordering::SeqCst) != gen {
                return;
            }
            let target = *animator.target.lock().unwrap();
            let dt = last.elapsed().as_secs_f64().min(0.05);
            last = Instant::now();

            vel += (SPRING_STIFFNESS * (target - pos) - SPRING_DAMPING * vel) * dt;
            pos += vel * dt;
            *animator.velocity.lock().unwrap() = vel;

            let settled = (pos - target).abs() < 0.5 && vel.abs() < 5.0;
            let h = if settled { target } else { pos };
            let (w, _) = logical_size(&win);
            let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(w, h)));

            if settled {
                *animator.velocity.lock().unwrap() = 0.0;
                return;
            }
        }
    });
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
                // Anchor as if the window were at its full configured height,
                // so the input bar lands in the same spot regardless of how
                // collapsed the panel currently is and expands downward.
                let full_h = app
                    .state::<SettingsManager>()
                    .inner
                    .lock()
                    .unwrap()
                    .launcher_size
                    .dimensions()
                    .1;
                center_on_cursor_monitor(&win, full_h);
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
/// Vertical placement uses `anchor_h` rather than the current (possibly
/// collapsed) height, so the dynamic-height launcher doesn't wander.
fn center_on_cursor_monitor(win: &tauri::WebviewWindow, anchor_h: f64) {
    let Some((mon_x, mon_y, mon_w, mon_h)) = cursor_monitor_work_area(win) else {
        let _ = win.center();
        return;
    };

    let (win_w, _) = logical_size(win);

    let x = mon_x + (mon_w - win_w) / 2.0;
    let y = mon_y + (mon_h - anchor_h) / 2.0;

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
