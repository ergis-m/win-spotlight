//! Extract app icons from .lnk files and UWP apps using the Windows Shell API.
//! Produces PNG data URIs with full alpha transparency, zero external crates.

use std::ffi::OsStr;
use std::mem;
use std::os::windows::ffi::OsStrExt;

// ── Windows API types ──

type HICON = isize;
type HDC = isize;
type HBITMAP = isize;
type HGDIOBJ = isize;

const SHGFI_ICON: u32 = 0x100;
const SHGFI_LARGEICON: u32 = 0x0;
const DIB_RGB_COLORS: u32 = 0;
const SIIGBF_ICONONLY: u32 = 0x4;

#[repr(C)]
struct SHFILEINFOW {
    h_icon: HICON,
    i_icon: i32,
    dw_attributes: u32,
    sz_display_name: [u16; 260],
    sz_type_name: [u16; 80],
}

#[repr(C)]
struct ICONINFO {
    f_icon: i32,
    x_hotspot: u32,
    y_hotspot: u32,
    hbm_mask: HBITMAP,
    hbm_color: HBITMAP,
}

#[repr(C)]
struct BITMAP {
    bm_type: i32,
    bm_width: i32,
    bm_height: i32,
    bm_width_bytes: i32,
    bm_planes: u16,
    bm_bits_pixel: u16,
    bm_bits: *mut u8,
}

#[repr(C)]
struct BITMAPINFOHEADER {
    bi_size: u32,
    bi_width: i32,
    bi_height: i32,
    bi_planes: u16,
    bi_bit_count: u16,
    bi_compression: u32,
    bi_size_image: u32,
    bi_x_pels_per_meter: i32,
    bi_y_pels_per_meter: i32,
    bi_clr_used: u32,
    bi_clr_important: u32,
}

#[repr(C)]
struct SIZE {
    cx: i32,
    cy: i32,
}

#[repr(C)]
struct GUID {
    data1: u32,
    data2: u16,
    data3: u16,
    data4: [u8; 8],
}

/// IShellItemImageFactory vtable layout.
#[repr(C)]
struct ImageFactoryVtbl {
    query_interface: usize,
    add_ref: usize,
    release: unsafe extern "system" fn(*mut std::ffi::c_void) -> u32,
    get_image: unsafe extern "system" fn(*mut std::ffi::c_void, SIZE, u32, *mut HBITMAP) -> i32,
}

const IID_SHELL_ITEM_IMAGE_FACTORY: GUID = GUID {
    data1: 0xBCC1_8B79,
    data2: 0xBA16,
    data3: 0x442F,
    data4: [0x80, 0xC4, 0x8A, 0x59, 0xC3, 0x0C, 0x46, 0x3B],
};

#[link(name = "shell32")]
extern "system" {
    fn SHGetFileInfoW(path: *const u16, attrs: u32, info: *mut SHFILEINFOW, cb: u32, flags: u32) -> usize;
    fn SHCreateItemFromParsingName(name: *const u16, ctx: *mut std::ffi::c_void, riid: *const GUID, ppv: *mut *mut std::ffi::c_void) -> i32;
}

const WM_GETICON: u32 = 0x007F;
const SMTO_ABORTIFHUNG: u32 = 0x0002;

#[link(name = "user32")]
extern "system" {
    fn DestroyIcon(h_icon: HICON) -> i32;
    fn GetIconInfo(h_icon: HICON, info: *mut ICONINFO) -> i32;
    fn GetDC(hwnd: isize) -> HDC;
    fn ReleaseDC(hwnd: isize, hdc: HDC) -> i32;
    fn SendMessageTimeoutW(hwnd: isize, msg: u32, wp: usize, lp: isize, flags: u32, timeout: u32, result: *mut isize) -> isize;
    fn GetClassLongPtrW(hwnd: isize, index: i32) -> usize;
}

#[link(name = "gdi32")]
extern "system" {
    fn GetDIBits(hdc: HDC, hbm: HBITMAP, start: u32, lines: u32, bits: *mut u8, bmi: *mut BITMAPINFOHEADER, usage: u32) -> i32;
    fn DeleteObject(ho: HGDIOBJ) -> i32;
    fn GetObjectW(h: HGDIOBJ, c: i32, pv: *mut u8) -> i32;
}

#[link(name = "ole32")]
extern "system" {
    fn CoInitialize(reserved: *mut std::ffi::c_void) -> i32;
}

// ── Public API ──

/// Extract icon from a .lnk shortcut file → `data:image/png;base64,...`
pub fn extract_icon_data_uri(lnk_path: &str) -> Option<String> {
    let (w, h, rgba) = extract_lnk_icon(lnk_path)?;
    Some(rgba_to_data_uri(w, h, &rgba))
}

/// Extract icon for a UWP app by its AppUserModelId → `data:image/png;base64,...`
pub fn extract_uwp_icon_data_uri(app_id: &str) -> Option<String> {
    let (w, h, rgba) = extract_shell_item_icon(app_id)?;
    Some(rgba_to_data_uri(w, h, &rgba))
}

/// Extract icon from a running window's HWND. Tries WM_GETICON,
/// then class icon, then falls back to the exe file icon.
pub fn extract_window_icon(hwnd: isize, exe_path: &str) -> Option<String> {
    unsafe {
        // Try WM_GETICON (ICON_BIG=1 for 32x32)
        for icon_type in [1usize, 0] {
            let mut hicon: isize = 0;
            let sent = SendMessageTimeoutW(
                hwnd, WM_GETICON, icon_type, 0,
                SMTO_ABORTIFHUNG, 100, &mut hicon,
            );
            if sent != 0 && hicon != 0 {
                if let Some((w, h, rgba)) = hicon_to_rgba(hicon) {
                    return Some(rgba_to_data_uri(w, h, &rgba));
                }
            }
        }

        // Try class icon (GCLP_HICON = -14)
        let hicon = GetClassLongPtrW(hwnd, -14);
        if hicon != 0 {
            if let Some((w, h, rgba)) = hicon_to_rgba(hicon as isize) {
                return Some(rgba_to_data_uri(w, h, &rgba));
            }
        }
    }

    // Fall back to exe file icon
    if !exe_path.is_empty() {
        return extract_icon_data_uri(exe_path);
    }
    None
}

fn rgba_to_data_uri(w: u32, h: u32, rgba: &[u8]) -> String {
    let png = encode_png(w, h, rgba);
    format!("data:image/png;base64,{}", base64_encode(&png))
}

// ── .lnk icon extraction (SHGetFileInfoW) ──

fn extract_lnk_icon(path: &str) -> Option<(u32, u32, Vec<u8>)> {
    unsafe {
        let wide = to_wide(path);
        let mut info: SHFILEINFOW = mem::zeroed();
        let ret = SHGetFileInfoW(
            wide.as_ptr(), 0, &mut info,
            mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );
        if ret == 0 || info.h_icon == 0 {
            return None;
        }
        let result = hicon_to_rgba(info.h_icon);
        DestroyIcon(info.h_icon);
        result
    }
}

// ── UWP icon extraction (COM IShellItemImageFactory) ──

fn extract_shell_item_icon(app_id: &str) -> Option<(u32, u32, Vec<u8>)> {
    unsafe {
        CoInitialize(std::ptr::null_mut());

        let parsing_name = format!("shell:AppsFolder\\{}", app_id);
        let wide = to_wide(&parsing_name);

        let mut factory: *mut std::ffi::c_void = std::ptr::null_mut();
        let hr = SHCreateItemFromParsingName(
            wide.as_ptr(),
            std::ptr::null_mut(),
            &IID_SHELL_ITEM_IMAGE_FACTORY,
            &mut factory,
        );
        if hr != 0 || factory.is_null() {
            return None;
        }

        let vtbl = *(factory as *const *const ImageFactoryVtbl);
        let size = SIZE { cx: 32, cy: 32 };
        let mut hbm: HBITMAP = 0;
        let hr = ((*vtbl).get_image)(factory, size, SIIGBF_ICONONLY, &mut hbm);
        ((*vtbl).release)(factory);

        if hr != 0 || hbm == 0 {
            return None;
        }

        let result = hbitmap_to_rgba(hbm);
        DeleteObject(hbm as HGDIOBJ);
        result
    }
}

// ── Shared bitmap helpers ──

unsafe fn hicon_to_rgba(hicon: HICON) -> Option<(u32, u32, Vec<u8>)> {
    let mut ii: ICONINFO = mem::zeroed();
    if GetIconInfo(hicon, &mut ii) == 0 {
        return None;
    }
    let result = hbitmap_to_rgba(ii.hbm_color);
    DeleteObject(ii.hbm_mask as HGDIOBJ);
    DeleteObject(ii.hbm_color as HGDIOBJ);
    result
}

unsafe fn hbitmap_to_rgba(hbitmap: HBITMAP) -> Option<(u32, u32, Vec<u8>)> {
    let mut bmp: BITMAP = mem::zeroed();
    if GetObjectW(hbitmap as HGDIOBJ, mem::size_of::<BITMAP>() as i32, &mut bmp as *mut BITMAP as *mut u8) == 0 {
        return None;
    }

    let w = bmp.bm_width;
    let h = bmp.bm_height;
    if w <= 0 || h <= 0 {
        return None;
    }
    let px = (w * h) as usize;
    let mut bgra = vec![0u8; px * 4];

    let hdc = GetDC(0);
    let mut bih: BITMAPINFOHEADER = mem::zeroed();
    bih.bi_size = mem::size_of::<BITMAPINFOHEADER>() as u32;
    bih.bi_width = w;
    bih.bi_height = -h; // top-down
    bih.bi_planes = 1;
    bih.bi_bit_count = 32;

    let ok = GetDIBits(hdc, hbitmap, 0, h as u32, bgra.as_mut_ptr(), &mut bih, DIB_RGB_COLORS);
    ReleaseDC(0, hdc);

    if ok == 0 {
        return None;
    }

    // BGRA → RGBA
    let mut rgba = vec![0u8; px * 4];
    for i in 0..px {
        rgba[i * 4]     = bgra[i * 4 + 2];
        rgba[i * 4 + 1] = bgra[i * 4 + 1];
        rgba[i * 4 + 2] = bgra[i * 4];
        rgba[i * 4 + 3] = bgra[i * 4 + 3];
    }

    // Legacy icons with all-zero alpha → fully opaque.
    if !rgba.iter().skip(3).step_by(4).any(|&a| a != 0) {
        for a in rgba.iter_mut().skip(3).step_by(4) {
            *a = 255;
        }
    }

    Some((w as u32, h as u32, rgba))
}

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

// ── Minimal PNG encoder (uncompressed DEFLATE, no crate deps) ──

fn encode_png(width: u32, height: u32, rgba: &[u8]) -> Vec<u8> {
    let row_bytes = (width as usize) * 4;
    let mut raw = Vec::with_capacity((row_bytes + 1) * height as usize);
    for y in 0..height as usize {
        raw.push(0); // filter: None
        raw.extend_from_slice(&rgba[y * row_bytes..(y + 1) * row_bytes]);
    }

    let zlib = zlib_store(&raw);
    let mut out = Vec::new();
    out.extend_from_slice(&[137, 80, 78, 71, 13, 10, 26, 10]);

    let mut ihdr = Vec::with_capacity(13);
    ihdr.extend_from_slice(&width.to_be_bytes());
    ihdr.extend_from_slice(&height.to_be_bytes());
    ihdr.push(8);
    ihdr.push(6); // RGBA
    ihdr.extend_from_slice(&[0, 0, 0]);
    png_chunk(&mut out, b"IHDR", &ihdr);
    png_chunk(&mut out, b"IDAT", &zlib);
    png_chunk(&mut out, b"IEND", &[]);
    out
}

fn png_chunk(out: &mut Vec<u8>, tag: &[u8; 4], data: &[u8]) {
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    out.extend_from_slice(tag);
    out.extend_from_slice(data);
    let mut crc_input = Vec::with_capacity(4 + data.len());
    crc_input.extend_from_slice(tag);
    crc_input.extend_from_slice(data);
    out.extend_from_slice(&crc32(&crc_input).to_be_bytes());
}

fn zlib_store(data: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(data.len() + 64);
    out.extend_from_slice(&[0x78, 0x01]);
    for (i, chunk) in data.chunks(65535).enumerate() {
        let is_last = (i + 1) * 65535 >= data.len();
        out.push(if is_last { 0x01 } else { 0x00 });
        let len = chunk.len() as u16;
        out.extend_from_slice(&len.to_le_bytes());
        out.extend_from_slice(&(!len).to_le_bytes());
        out.extend_from_slice(chunk);
    }
    out.extend_from_slice(&adler32(data).to_be_bytes());
    out
}

fn adler32(data: &[u8]) -> u32 {
    let (mut a, mut b): (u32, u32) = (1, 0);
    for &byte in data {
        a = (a + byte as u32) % 65521;
        b = (b + a) % 65521;
    }
    (b << 16) | a
}

fn crc32(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFF_FFFF;
    for &byte in data {
        crc = CRC_TABLE[((crc ^ byte as u32) & 0xFF) as usize] ^ (crc >> 8);
    }
    crc ^ 0xFFFF_FFFF
}

const CRC_TABLE: [u32; 256] = {
    let mut table = [0u32; 256];
    let mut n = 0usize;
    while n < 256 {
        let mut c = n as u32;
        let mut k = 0;
        while k < 8 {
            if c & 1 != 0 { c = 0xEDB8_8320 ^ (c >> 1); } else { c >>= 1; }
            k += 1;
        }
        table[n] = c;
        n += 1;
    }
    table
};

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn base64_encode(data: &[u8]) -> String {
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let (b0, b1, b2) = (
            chunk[0] as u32,
            chunk.get(1).copied().unwrap_or(0) as u32,
            chunk.get(2).copied().unwrap_or(0) as u32,
        );
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(B64[((n >> 18) & 63) as usize] as char);
        out.push(B64[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 { B64[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { B64[(n & 63) as usize] as char } else { '=' });
    }
    out
}
