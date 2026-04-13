//! Enumerate browser tabs via Windows UI Automation.
//!
//! Queries Chromium-based browsers (Chrome, Edge, Brave, Vivaldi) for
//! individual tab titles by walking the accessibility tree.

use crate::running::RunningWindow;

/// A single browser tab.
#[derive(Clone, Debug)]
pub struct BrowserTab {
    pub window_hwnd: isize,
    pub title: String,
    pub exe_path: String,
}

/// Chromium-based browser executable names.
const CHROMIUM_EXES: &[&str] = &["chrome.exe", "msedge.exe", "brave.exe", "vivaldi.exe"];

fn is_chromium(exe_path: &str) -> bool {
    let lower = exe_path.to_lowercase();
    CHROMIUM_EXES.iter().any(|name| lower.ends_with(name))
}

/// Enumerate all tabs across Chromium browser windows.
/// Returns an empty vec on any error (COM failure, no browsers, etc.).
pub fn get_browser_tabs(windows: &[RunningWindow]) -> Vec<BrowserTab> {
    get_browser_tabs_inner(windows).unwrap_or_default()
}

fn get_browser_tabs_inner(
    windows: &[RunningWindow],
) -> Result<Vec<BrowserTab>, windows::core::Error> {
    use windows::Win32::System::Com::*;
    use windows::Win32::UI::Accessibility::*;

    let browser_wins: Vec<_> = windows.iter().filter(|w| is_chromium(&w.exe_path)).collect();
    if browser_wins.is_empty() {
        return Ok(Vec::new());
    }

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }

    let automation: IUIAutomation =
        unsafe { CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)? };

    // Condition to locate Chrome's native tab container by class name.
    // Searching by ClassName avoids hitting web-page Tab controls (e.g.
    // Gmail category tabs) that appear earlier in depth-first order.
    let container_cond = unsafe {
        automation.CreatePropertyCondition(
            UIA_ClassNamePropertyId,
            &windows::Win32::System::Variant::VARIANT::from("TabContainerImpl"),
        )?
    };
    let tab_item_cond = unsafe {
        automation.CreatePropertyCondition(
            UIA_ControlTypePropertyId,
            &windows::Win32::System::Variant::VARIANT::from(UIA_TabItemControlTypeId.0),
        )?
    };

    let mut all_tabs = Vec::new();

    for win in browser_wins {
        let hwnd = windows::Win32::Foundation::HWND(win.hwnd as *mut _);

        let element = match unsafe { automation.ElementFromHandle(hwnd) } {
            Ok(e) => e,
            Err(_) => continue,
        };

        // Find Chrome's TabContainerImpl — the native container that holds
        // browser tab items (not web-page tab controls).
        let container = match unsafe { element.FindFirst(TreeScope_Descendants, &container_cond) } {
            Ok(s) => s,
            Err(_) => continue,
        };

        // TabItem elements are direct children of the container.
        let found = match unsafe { container.FindAll(TreeScope_Children, &tab_item_cond) } {
            Ok(f) => f,
            Err(_) => continue,
        };

        let count = unsafe { found.Length().unwrap_or(0) };

        for i in 0..count {
            let tab_el = match unsafe { found.GetElement(i) } {
                Ok(t) => t,
                Err(_) => continue,
            };
            let name = match unsafe { tab_el.CurrentName() } {
                Ok(n) => n.to_string(),
                Err(_) => continue,
            };
            if name.is_empty() {
                continue;
            }

            all_tabs.push(BrowserTab {
                window_hwnd: win.hwnd,
                title: name,
                exe_path: win.exe_path.clone(),
            });
        }
    }

    Ok(all_tabs)
}

/// Switch to a specific tab by title in a browser window, then foreground it.
pub fn switch_to_tab(hwnd: isize, tab_title: &str) {
    let _ = switch_to_tab_inner(hwnd, tab_title);
    crate::running::switch_to(hwnd);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_enumerate_browser_tabs() {
        let windows = crate::running::get_windows();
        let browser_count = windows.iter().filter(|w| is_chromium(&w.exe_path)).count();
        println!("Found {} total windows, {} are Chromium browsers", windows.len(), browser_count);

        let t0 = std::time::Instant::now();
        let tabs = get_browser_tabs(&windows);
        let elapsed = t0.elapsed();

        println!("Enumerated {} tabs in {:?}", tabs.len(), elapsed);
        for (i, tab) in tabs.iter().enumerate() {
            println!("  [{}] hwnd={} title={:?}", i, tab.window_hwnd, tab.title);
        }
    }

}

fn switch_to_tab_inner(hwnd: isize, tab_title: &str) -> Result<(), windows::core::Error> {
    use windows::Win32::System::Com::*;
    use windows::Win32::UI::Accessibility::*;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }

    let automation: IUIAutomation =
        unsafe { CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)? };

    let hwnd_handle = windows::Win32::Foundation::HWND(hwnd as *mut _);
    let element = unsafe { automation.ElementFromHandle(hwnd_handle)? };

    let container = unsafe {
        let cond = automation.CreatePropertyCondition(
            UIA_ClassNamePropertyId,
            &windows::Win32::System::Variant::VARIANT::from("TabContainerImpl"),
        )?;
        element.FindFirst(TreeScope_Descendants, &cond)?
    };

    let tab_item_cond = unsafe {
        automation.CreatePropertyCondition(
            UIA_ControlTypePropertyId,
            &windows::Win32::System::Variant::VARIANT::from(UIA_TabItemControlTypeId.0),
        )?
    };

    let found = unsafe { container.FindAll(TreeScope_Children, &tab_item_cond)? };
    let count = unsafe { found.Length()? };

    for i in 0..count {
        let tab_el = unsafe { found.GetElement(i)? };
        let name = unsafe { tab_el.CurrentName()? };

        if name.to_string() == tab_title {
            let pattern: IUIAutomationSelectionItemPattern =
                unsafe { tab_el.GetCurrentPatternAs(UIA_SelectionItemPatternId)? };
            unsafe { pattern.Select()? };
            return Ok(());
        }
    }

    Ok(())
}
