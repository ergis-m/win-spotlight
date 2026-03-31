//! Low-level keyboard hook for recording shortcuts.
//! Intercepts at the OS level so system combos like Alt+Space are captured
//! instead of triggering the window system menu.

use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::sync::Mutex;
use tauri::Emitter;
use windows::Win32::Foundation::*;
use windows::Win32::UI::Input::KeyboardAndMouse::*;
use windows::Win32::UI::WindowsAndMessaging::*;

static ACTIVE: AtomicBool = AtomicBool::new(false);
static HOOK_RAW: AtomicIsize = AtomicIsize::new(0);
static APP: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);

/// Install the hook. Must be called on the main (UI) thread.
pub fn start(handle: tauri::AppHandle) {
    *APP.lock().unwrap() = Some(handle);
    ACTIVE.store(true, Ordering::SeqCst);

    unsafe {
        if let Ok(h) = SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_proc), None, 0)
        {
            HOOK_RAW.store(h.0 as isize, Ordering::SeqCst);
        }
    }
}

/// Remove the hook (safe to call even if not recording).
pub fn stop() {
    ACTIVE.store(false, Ordering::SeqCst);
    let raw = HOOK_RAW.swap(0, Ordering::SeqCst);
    if raw != 0 {
        unsafe {
            let _ = UnhookWindowsHookEx(HHOOK(raw as *mut _));
        }
    }
    *APP.lock().unwrap() = None;
}

// ── hook proc (runs on the main thread) ──

unsafe extern "system" fn hook_proc(code: i32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    if code >= 0 && ACTIVE.load(Ordering::Relaxed) {
        let down = wp.0 == WM_KEYDOWN as usize || wp.0 == WM_SYSKEYDOWN as usize;
        if down {
            let vk = (*(lp.0 as *const KBDLLHOOKSTRUCT)).vkCode as u16;

            // Escape → cancel
            if vk == VK_ESCAPE.0 {
                ACTIVE.store(false, Ordering::SeqCst);
                emit("shortcut-cancelled", String::new());
                return LRESULT(1);
            }

            // Non-modifier key while modifiers are held → capture
            if !is_modifier(vk) {
                let mods = held_modifiers();
                if !mods.is_empty() {
                    let name = vk_name(vk);
                    let shortcut = format!("{}+{}", mods.join("+"), name);
                    ACTIVE.store(false, Ordering::SeqCst);
                    emit("shortcut-recorded", shortcut);
                    return LRESULT(1);
                }
            }
        }
        // Suppress everything while recording so OS shortcuts don't fire.
        return LRESULT(1);
    }

    CallNextHookEx(None, code, wp, lp)
}

fn emit(event: &str, payload: String) {
    if let Ok(g) = APP.try_lock() {
        if let Some(app) = g.as_ref() {
            let _ = app.emit(event, payload);
        }
    }
}

// ── helpers ──

fn is_modifier(vk: u16) -> bool {
    vk == VK_LSHIFT.0
        || vk == VK_RSHIFT.0
        || vk == VK_SHIFT.0
        || vk == VK_LCONTROL.0
        || vk == VK_RCONTROL.0
        || vk == VK_CONTROL.0
        || vk == VK_LMENU.0
        || vk == VK_RMENU.0
        || vk == VK_MENU.0
        || vk == VK_LWIN.0
        || vk == VK_RWIN.0
}

fn held_modifiers() -> Vec<&'static str> {
    let mut m = Vec::new();
    unsafe {
        if GetAsyncKeyState(i32::from(VK_CONTROL.0)) < 0 {
            m.push("Ctrl");
        }
        if GetAsyncKeyState(i32::from(VK_MENU.0)) < 0 {
            m.push("Alt");
        }
        if GetAsyncKeyState(i32::from(VK_SHIFT.0)) < 0 {
            m.push("Shift");
        }
        if GetAsyncKeyState(i32::from(VK_LWIN.0)) < 0
            || GetAsyncKeyState(i32::from(VK_RWIN.0)) < 0
        {
            m.push("Super");
        }
    }
    m
}

fn vk_name(vk: u16) -> String {
    match vk {
        x if x == VK_SPACE.0 => "Space".into(),
        x if x == VK_RETURN.0 => "Enter".into(),
        x if x == VK_TAB.0 => "Tab".into(),
        x if x == VK_BACK.0 => "Backspace".into(),
        x if x == VK_DELETE.0 => "Delete".into(),
        x if x == VK_INSERT.0 => "Insert".into(),
        x if x == VK_HOME.0 => "Home".into(),
        x if x == VK_END.0 => "End".into(),
        x if x == VK_PRIOR.0 => "PageUp".into(),
        x if x == VK_NEXT.0 => "PageDown".into(),
        x if x == VK_UP.0 => "Up".into(),
        x if x == VK_DOWN.0 => "Down".into(),
        x if x == VK_LEFT.0 => "Left".into(),
        x if x == VK_RIGHT.0 => "Right".into(),
        x if x >= VK_F1.0 && x <= VK_F12.0 => format!("F{}", x - VK_F1.0 + 1),
        x if (0x30..=0x39).contains(&x) => ((x as u8) as char).to_string(),
        x if (0x41..=0x5A).contains(&x) => ((x as u8) as char).to_string(),
        _ => format!("VK{vk}"),
    }
}
