//! Enumerate visible application windows and switch focus to them.

const GWL_EXSTYLE: i32 = -20;
const WS_EX_TOOLWINDOW: i32 = 0x0000_0080;
const WS_EX_APPWINDOW: i32 = 0x0004_0000;
const GW_OWNER: u32 = 4;
const SW_RESTORE: i32 = 9;
const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;

extern "system" {
    fn EnumWindows(cb: unsafe extern "system" fn(isize, isize) -> i32, param: isize) -> i32;
    fn GetWindowTextW(hwnd: isize, buf: *mut u16, max: i32) -> i32;
    fn GetWindowTextLengthW(hwnd: isize) -> i32;
    fn IsWindowVisible(hwnd: isize) -> i32;
    fn GetWindowLongW(hwnd: isize, index: i32) -> i32;
    fn GetWindow(hwnd: isize, cmd: u32) -> isize;
    fn GetWindowThreadProcessId(hwnd: isize, pid: *mut u32) -> u32;
    fn SetForegroundWindow(hwnd: isize) -> i32;
    fn ShowWindow(hwnd: isize, cmd: i32) -> i32;
    fn IsIconic(hwnd: isize) -> i32;
    fn GetCurrentThreadId() -> u32;
    fn AttachThreadInput(attach: u32, to: u32, yes: i32) -> i32;
    fn OpenProcess(access: u32, inherit: i32, pid: u32) -> isize;
    fn CloseHandle(h: isize) -> i32;
    fn QueryFullProcessImageNameW(proc: isize, flags: u32, name: *mut u16, size: *mut u32) -> i32;
}

#[derive(Clone, Debug)]
pub struct RunningWindow {
    pub hwnd: isize,
    pub title: String,
    pub exe_path: String,
}

/// Returns all visible application windows (similar to Alt+Tab list).
pub fn get_windows() -> Vec<RunningWindow> {
    let own_pid = std::process::id();
    let mut raw: Vec<(isize, String, u32)> = Vec::new();

    unsafe {
        EnumWindows(enum_cb, &mut raw as *mut _ as isize);
    }

    raw.into_iter()
        .filter(|(_, _, pid)| *pid != own_pid)
        .map(|(hwnd, title, pid)| RunningWindow {
            hwnd,
            title,
            exe_path: get_exe_path(pid).unwrap_or_default(),
        })
        .collect()
}

unsafe extern "system" fn enum_cb(hwnd: isize, param: isize) -> i32 {
    let list = &mut *(param as *mut Vec<(isize, String, u32)>);

    if IsWindowVisible(hwnd) == 0 {
        return 1;
    }

    let ex = GetWindowLongW(hwnd, GWL_EXSTYLE);

    // Alt+Tab logic: show if WS_EX_APPWINDOW, hide if WS_EX_TOOLWINDOW,
    // otherwise show only if no owner (top-level).
    let dominated = (ex & WS_EX_APPWINDOW) == 0
        && ((ex & WS_EX_TOOLWINDOW) != 0 || GetWindow(hwnd, GW_OWNER) != 0);
    if dominated {
        return 1;
    }

    let len = GetWindowTextLengthW(hwnd);
    if len == 0 {
        return 1;
    }
    let mut buf = vec![0u16; (len + 1) as usize];
    let actual = GetWindowTextW(hwnd, buf.as_mut_ptr(), len + 1);
    if actual == 0 {
        return 1;
    }
    let title = String::from_utf16_lossy(&buf[..actual as usize]);

    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, &mut pid);

    list.push((hwnd, title, pid));
    1
}

fn get_exe_path(pid: u32) -> Option<String> {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle == 0 {
            return None;
        }
        let mut buf = vec![0u16; 1024];
        let mut size = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(handle, 0, buf.as_mut_ptr(), &mut size);
        CloseHandle(handle);
        if ok == 0 {
            return None;
        }
        Some(String::from_utf16_lossy(&buf[..size as usize]))
    }
}

/// Bring a window to the foreground and restore it if minimized.
pub fn switch_to(hwnd: isize) {
    unsafe {
        if IsIconic(hwnd) != 0 {
            ShowWindow(hwnd, SW_RESTORE);
        }

        let target_thread = GetWindowThreadProcessId(hwnd, std::ptr::null_mut());
        let our_thread = GetCurrentThreadId();

        if target_thread != 0 && target_thread != our_thread {
            AttachThreadInput(our_thread, target_thread, 1);
            SetForegroundWindow(hwnd);
            AttachThreadInput(our_thread, target_thread, 0);
        } else {
            SetForegroundWindow(hwnd);
        }
    }
}
