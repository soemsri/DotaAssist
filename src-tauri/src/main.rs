// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tiny_http::{Method, Response, Server, StatusCode};

mod desktop;

#[tauri::command]
fn toggle_overlay_window(window: WebviewWindow, overlay: bool) -> Result<(), String> {
    let state = window.state::<desktop::DesktopState>();
    let mut s = state.0.lock().unwrap();
    if overlay && !s.hotkey_ready {
        return Err(
            "Configure an available interaction hotkey in Settings before entering the overlay."
                .into(),
        );
    }
    window
        .set_ignore_cursor_events(false)
        .map_err(|e| e.to_string())?;
    window
        .set_always_on_top(overlay)
        .map_err(|e| e.to_string())?;
    window
        .set_decorations(!overlay)
        .map_err(|e| e.to_string())?;
    let (width, height) = if overlay {
        (360.0, 520.0)
    } else {
        (1280.0, 840.0)
    };
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize::new(width, height)))
        .map_err(|e| e.to_string())?;
    window
        .set_ignore_cursor_events(overlay)
        .map_err(|e| e.to_string())?;
    s.overlay = overlay;
    s.interactive = !overlay;
    drop(s);
    window
        .emit(
            "desktop-status",
            desktop::desktop_status(window.app_handle().clone()),
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct MinimapScanResult {
    pub enemies_visible_count: usize,
    pub all_missing: bool,
    pub scanned: bool,
    pub message: String,
}

#[cfg(target_os = "windows")]
mod win_capture {
    use std::ffi::c_void;
    #[cfg(debug_assertions)]
    use std::fs::File;
    #[cfg(debug_assertions)]
    use std::io::Write;
    #[cfg(debug_assertions)]
    use std::path::Path;

    type HDC = *mut c_void;
    type HBITMAP = *mut c_void;
    type HGDIOBJ = *mut c_void;
    type HWND = *mut c_void;
    type BOOL = i32;

    const SRCCOPY: u32 = 0x00CC0020;
    const CAPTUREBLT: u32 = 0x40000000;
    const BI_RGB: u32 = 0;
    const DIB_RGB_COLORS: u32 = 0;
    const SM_CXSCREEN: i32 = 0;
    const SM_CYSCREEN: i32 = 1;

    #[repr(C)]
    #[allow(non_snake_case)]
    struct BITMAPINFOHEADER {
        biSize: u32,
        biWidth: i32,
        biHeight: i32,
        biPlanes: u16,
        biBitCount: u16,
        biCompression: u32,
        biSizeImage: u32,
        biXPelsPerMeter: i32,
        biYPelsPerMeter: i32,
        biClrUsed: u32,
        biClrImportant: u32,
    }

    #[repr(C)]
    #[allow(non_snake_case)]
    struct BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER,
        bmiColors: [u32; 1],
    }

    #[link(name = "user32")]
    extern "system" {
        fn GetDC(hWnd: HWND) -> HDC;
        fn ReleaseDC(hWnd: HWND, hDC: HDC) -> i32;
        fn GetSystemMetrics(nIndex: i32) -> i32;
    }

    #[link(name = "gdi32")]
    extern "system" {
        fn CreateCompatibleDC(hdc: HDC) -> HDC;
        fn CreateCompatibleBitmap(hdc: HDC, cx: i32, cy: i32) -> HBITMAP;
        fn SelectObject(hdc: HDC, h: HGDIOBJ) -> HGDIOBJ;
        fn BitBlt(
            hdc: HDC,
            x: i32,
            y: i32,
            cx: i32,
            cy: i32,
            hdcSrc: HDC,
            x1: i32,
            y1: i32,
            rop: u32,
        ) -> BOOL;
        fn GetDIBits(
            hdc: HDC,
            hbm: HBITMAP,
            start: u32,
            cLines: u32,
            lpvBits: *mut c_void,
            lpbmi: *mut BITMAPINFO,
            usage: u32,
        ) -> i32;
        fn DeleteDC(hdc: HDC) -> BOOL;
        fn DeleteObject(ho: HGDIOBJ) -> BOOL;
    }

    pub fn capture_minimap(position: &str) -> Option<(Vec<u8>, usize, usize)> {
        unsafe {
            let screen_w = GetSystemMetrics(SM_CXSCREEN);
            let screen_h = GetSystemMetrics(SM_CYSCREEN);
            if screen_w <= 0 || screen_h <= 0 {
                return None;
            }

            // The Dota minimap is square. The old width/height percentages
            // diverged on ultrawide displays and caused the scan to sample
            // outside the minimap. Keep the height-based size, but use it for
            // both axes so the ROI remains square across aspect ratios.
            let map_size = ((screen_h as f32 * 0.235).round() as i32)
                .clamp(160, 480)
                .min(screen_w);
            let map_w = map_size;
            let map_h = map_size;
            let start_x = if position == "right" {
                screen_w - map_w
            } else {
                0
            };
            let start_y = screen_h - map_h;

            #[link(name = "user32")]
            extern "system" {
                fn OpenInputDesktop(dwFlags: u32, fInherit: BOOL, dwDesiredAccess: u32) -> *mut c_void;
                fn SetThreadDesktop(hDesktop: *mut c_void) -> BOOL;
                fn CloseDesktop(hDesktop: *mut c_void) -> BOOL;
            }

            // Ensure Tauri threadpool worker threads are attached to the interactive input desktop
            let input_desk = OpenInputDesktop(0, 0, 0x0100 /* DESKTOP_SWITCHDESKTOP */ | 0x0001 /* DESKTOP_READOBJECTS */ | 0x0004 /* DESKTOP_WRITEOBJECTS */);
            if !input_desk.is_null() {
                SetThreadDesktop(input_desk);
                CloseDesktop(input_desk);
            }

            let hdc_screen = GetDC(std::ptr::null_mut());
            if hdc_screen.is_null() {
                return None;
            }

            let hdc_mem = CreateCompatibleDC(hdc_screen);
            if hdc_mem.is_null() {
                ReleaseDC(std::ptr::null_mut(), hdc_screen);
                return None;
            }

            let hbm = CreateCompatibleBitmap(hdc_screen, map_w, map_h);
            if hbm.is_null() {
                DeleteDC(hdc_mem);
                ReleaseDC(std::ptr::null_mut(), hdc_screen);
                return None;
            }

            let old_obj = SelectObject(hdc_mem, hbm);
            // Try standard SRCCOPY first without CAPTUREBLT to avoid DWM GPU presentation stall and DirectX stutter
            let mut blt_res = BitBlt(
                hdc_mem,
                0,
                0,
                map_w,
                map_h,
                hdc_screen,
                start_x,
                start_y,
                SRCCOPY,
            );

            if blt_res == 0 {
                // Fallback to CAPTUREBLT only if plain SRCCOPY was unable to capture
                blt_res = BitBlt(
                    hdc_mem,
                    0,
                    0,
                    map_w,
                    map_h,
                    hdc_screen,
                    start_x,
                    start_y,
                    SRCCOPY | CAPTUREBLT,
                );
            }

            if blt_res == 0 {
                SelectObject(hdc_mem, old_obj);
                DeleteObject(hbm);
                DeleteDC(hdc_mem);
                ReleaseDC(std::ptr::null_mut(), hdc_screen);
                return None;
            }

            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: map_w,
                    biHeight: -map_h, // top-down
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB,
                    biSizeImage: 0,
                    biXPelsPerMeter: 0,
                    biYPelsPerMeter: 0,
                    biClrUsed: 0,
                    biClrImportant: 0,
                },
                bmiColors: [0; 1],
            };

            let mut buffer = vec![0u8; (map_w * map_h * 4) as usize];
            let dib_res = GetDIBits(
                hdc_mem,
                hbm,
                0,
                map_h as u32,
                buffer.as_mut_ptr() as *mut c_void,
                &mut bmi,
                DIB_RGB_COLORS,
            );

            SelectObject(hdc_mem, old_obj);
            DeleteObject(hbm);
            DeleteDC(hdc_mem);
            ReleaseDC(std::ptr::null_mut(), hdc_screen);

            if dib_res == 0 {
                None
            } else {
                Some((buffer, map_w as usize, map_h as usize))
            }
        }
    }

    #[cfg(debug_assertions)]
    pub fn save_debug_bmp(buffer: &[u8], width: usize, height: usize, path: &Path) -> std::io::Result<()> {
        let pixel_bytes = (width * height * 4) as u32;
        let file_size = 14u32 + 40u32 + pixel_bytes;
        let mut file = File::create(path)?;

        // BITMAPFILEHEADER
        file.write_all(b"BM")?;
        file.write_all(&file_size.to_le_bytes())?;
        file.write_all(&[0u8; 4])?;
        file.write_all(&(54u32).to_le_bytes())?;

        // BITMAPINFOHEADER, using a top-down 32-bit BGRA buffer.
        file.write_all(&(40u32).to_le_bytes())?;
        file.write_all(&(width as i32).to_le_bytes())?;
        file.write_all(&(-(height as i32)).to_le_bytes())?;
        file.write_all(&(1u16).to_le_bytes())?;
        file.write_all(&(32u16).to_le_bytes())?;
        file.write_all(&(0u32).to_le_bytes())?;
        file.write_all(&pixel_bytes.to_le_bytes())?;
        file.write_all(&[0u8; 16])?;
        file.write_all(buffer)?;
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn is_enemy_marker_pixel(blue: u32, green: u32, red: u32) -> bool {
    // In Dota 2 client HUD, enemy markers (heroes, creeps, towers) are ALWAYS RED.
    // Friendly units are green. This applies regardless of playing as Radiant or Dire.
    let other_max = green.max(blue);
    red >= 115
        && red >= other_max.saturating_add(25)
        && red >= green.saturating_mul(7) / 5
        && red >= blue.saturating_mul(7) / 5
}

#[cfg(target_os = "windows")]
fn get_inner_minimap_bounds(
    position: &str,
    width: usize,
    height: usize,
) -> (usize, usize, usize, usize) {
    // Constrain ROI to inner minimap, excluding border stone frame and
    // HUD action buttons (Courier, Scan, Glyph, Fortify).
    let (min_xn, max_xn) = if position == "right" {
        (0.185f32, 0.955f32)
    } else {
        (0.045f32, 0.815f32)
    };
    let (min_yn, max_yn) = (0.040f32, 0.970f32);

    let min_x = ((min_xn * width as f32).round() as usize).min(width);
    let max_x = ((max_xn * width as f32).round() as usize).min(width);
    let min_y = ((min_yn * height as f32).round() as usize).min(height);
    let max_y = ((max_yn * height as f32).round() as usize).min(height);

    (min_x, max_x, min_y, max_y)
}

#[cfg(target_os = "windows")]
fn is_in_base(nx: f32, ny: f32) -> bool {
    // Dire Base (top right in inner minimap normalized coordinates)
    if nx > 0.72 && ny < 0.28 {
        return true;
    }
    // Radiant Base (bottom left in inner minimap normalized coordinates)
    if nx < 0.28 && ny > 0.72 {
        return true;
    }
    false
}

#[cfg(all(test, target_os = "windows"))]
mod minimap_tests {
    use super::*;

    #[test]
    fn enemy_markers_detection_red_pixels() {
        // Red enemy marker pixel (prominent red)
        assert!(is_enemy_marker_pixel(20, 35, 180));
        // Green friendly marker pixel (should not match)
        assert!(!is_enemy_marker_pixel(20, 180, 35));
        // Blue/grey water/terrain (should not match)
        assert!(!is_enemy_marker_pixel(180, 35, 20));
    }

    #[test]
    fn test_inner_minimap_bounds() {
        let (min_x, max_x, min_y, max_y) = get_inner_minimap_bounds("left", 160, 160);
        assert!(min_x > 0);
        assert!(max_x < 160);
        assert!(min_y > 0);
        assert!(max_y < 160);
        assert!(max_x > min_x);
        assert!(max_y > min_y);
    }

    #[test]
    fn test_base_coordinates() {
        // Dire fountain/ancient
        assert!(is_in_base(0.85, 0.15));
        // Radiant fountain/ancient
        assert!(is_in_base(0.15, 0.85));
        // Mid lane river (OD vs Sniper)
        assert!(!is_in_base(0.46, 0.60));
        // Bot lane
        assert!(!is_in_base(0.81, 0.83));
    }

    #[test]
    fn test_live_scan_minimap() {
        let result = scan_minimap(Some("left".to_string()), Some("radiant".to_string()));
        println!("scan_minimap result: {:?}", result);
    }
}



#[tauri::command]
fn scan_minimap(
    position: Option<String>,
    player_team: Option<String>,
) -> Result<MinimapScanResult, String> {
    #[cfg(target_os = "windows")]
    {
        let pos = position.unwrap_or_else(|| "left".to_string());
        #[allow(unused_variables)]
        let team_str = player_team.unwrap_or_default().to_lowercase();
        if let Some((buffer, width, height)) = win_capture::capture_minimap(&pos) {
            let (min_x, max_x, min_y, max_y) = get_inner_minimap_bounds(&pos, width, height);
            let inner_w = (max_x.saturating_sub(min_x)).max(1);
            let inner_h = (max_y.saturating_sub(min_y)).max(1);
            let inner_area = inner_w * inner_h;

            let mut candidate = vec![false; width * height];
            #[cfg(debug_assertions)]
            let mut debug_buffer = buffer.clone();
            #[cfg(debug_assertions)]
            let mut cluster_summaries: Vec<String> = Vec::new();

            for y in min_y..max_y {
                let ny = (y - min_y) as f32 / inner_h as f32;
                for x in min_x..max_x {
                    let nx = (x - min_x) as f32 / inner_w as f32;
                    if is_in_base(nx, ny) {
                        continue;
                    }
                    let idx = (y * width + x) * 4;
                    if idx + 2 < buffer.len() {
                        let b = buffer[idx] as u32;
                        let g = buffer[idx + 1] as u32;
                        let r = buffer[idx + 2] as u32;

                        let matches = is_enemy_marker_pixel(b, g, r);
                        if matches {
                            candidate[y * width + x] = true;
                            #[cfg(debug_assertions)]
                            {
                                let debug_idx = (y * width + x) * 4;
                                debug_buffer[debug_idx] = 255;
                                debug_buffer[debug_idx + 1] = 0;
                                debug_buffer[debug_idx + 2] = 255;
                            }
                        }
                    }
                }
            }

            let min_dim_threshold = (5usize).max((inner_w as f32 * 0.038).round() as usize);
            let max_dim_threshold = (inner_w as f32 * 0.18).round() as usize;
            let min_size_threshold = (18usize).max((inner_area as f32 * 0.0011).round() as usize);
            let max_size_threshold = (450usize).max((inner_area as f32 * 0.04).round() as usize);

            let mut visited = vec![false; width * height];
            let mut hero_clusters_count = 0;

            for y in min_y..max_y {
                for x in min_x..max_x {
                    let start_idx = y * width + x;
                    if candidate[start_idx] && !visited[start_idx] {
                        visited[start_idx] = true;
                        let mut cluster_size = 0;
                        let mut min_cluster_x = x;
                        let mut max_cluster_x = x;
                        let mut min_cluster_y = y;
                        let mut max_cluster_y = y;
                        let mut queue = std::collections::VecDeque::new();
                        queue.push_back((x, y));

                        while let Some((cx, cy)) = queue.pop_front() {
                            cluster_size += 1;
                            min_cluster_x = min_cluster_x.min(cx);
                            max_cluster_x = max_cluster_x.max(cx);
                            min_cluster_y = min_cluster_y.min(cy);
                            max_cluster_y = max_cluster_y.max(cy);

                            // 4-connectivity prevents diagonally touching creeps from merging into giant blobs
                            for &(dx, dy) in &[(-1isize, 0isize), (1, 0), (0, -1), (0, 1)] {
                                let nx = cx as isize + dx;
                                let ny = cy as isize + dy;
                                if nx >= min_x as isize
                                    && nx < max_x as isize
                                    && ny >= min_y as isize
                                    && ny < max_y as isize
                                {
                                    let n_idx = (ny as usize) * width + (nx as usize);
                                    if candidate[n_idx] && !visited[n_idx] {
                                        visited[n_idx] = true;
                                        queue.push_back((nx as usize, ny as usize));
                                    }
                                }
                            }
                        }

                        let cluster_width = max_cluster_x - min_cluster_x + 1;
                        let cluster_height = max_cluster_y - min_cluster_y + 1;
                        let cluster_box_area = cluster_width * cluster_height;
                        let fill_ratio = cluster_size as f32 / cluster_box_area as f32;
                        let aspect_ratio = (cluster_width.min(cluster_height) as f32)
                            / (cluster_width.max(cluster_height) as f32);

                        let cluster_min_dim = cluster_width.min(cluster_height);
                        let cluster_max_dim = cluster_width.max(cluster_height);

                        let looks_like_hero = cluster_size >= min_size_threshold
                            && cluster_size <= max_size_threshold
                            && cluster_min_dim >= min_dim_threshold
                            && cluster_max_dim <= max_dim_threshold
                            && fill_ratio >= 0.20
                            && aspect_ratio >= 0.35;

                        #[cfg(debug_assertions)]
                        cluster_summaries.push(format!(
                            "{}px {}x{} at {},{} => {}",
                            cluster_size,
                            cluster_width,
                            cluster_height,
                            min_cluster_x,
                            min_cluster_y,
                            if looks_like_hero { "hero" } else { "ignored" }
                        ));

                        if looks_like_hero {
                            hero_clusters_count += 1;
                        }
                    }
                }
            }

            let enemies_count = hero_clusters_count.min(5);
            let all_missing = enemies_count == 0;

            Ok(MinimapScanResult {
                enemies_visible_count: enemies_count,
                all_missing,
                scanned: true,
                message: if all_missing {
                    "No enemies detected on minimap".to_string()
                } else {
                    format!("{} enemies spotted on minimap", enemies_count)
                },
            })
        } else {
            #[cfg(debug_assertions)]
            println!(
                "[DotaAssist Minimap] capture failed position={} player_team={}",
                pos,
                team_str
            );

            Ok(MinimapScanResult {
                enemies_visible_count: 0,
                all_missing: false,
                scanned: false,
                message: "Failed to capture screen".to_string(),
            })
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (position, player_team);
        Ok(MinimapScanResult {
            enemies_visible_count: 0,
            all_missing: false,
            scanned: false,
            message: "Minimap scanner only supported on Windows".to_string(),
        })
    }
}

#[cfg(target_os = "windows")]
mod win_tts {
    use std::collections::hash_map::DefaultHasher;
    use std::ffi::OsStr;
    use std::fs;
    use std::hash::{Hash, Hasher};
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "urlmon")]
    extern "system" {
        fn URLDownloadToFileW(
            pCaller: *mut std::ffi::c_void,
            szURL: *const u16,
            szFileName: *const u16,
            dwReserved: u32,
            lpfnCB: *mut std::ffi::c_void,
        ) -> i32;
    }

    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(Some(0)).collect()
    }

    pub fn download_and_get_base64(text: &str, lang: &str) -> Result<String, String> {
        let mut hasher = DefaultHasher::new();
        text.hash(&mut hasher);
        lang.hash(&mut hasher);
        let hash = hasher.finish();

        let temp_dir = std::env::temp_dir().join("dotaassist_tts");
        let _ = fs::create_dir_all(&temp_dir);
        let file_path = temp_dir.join(format!("{}.mp3", hash));

        // If cached file already exists, return instantly from cache
        if file_path.exists() {
            if let Ok(bytes) = fs::read(&file_path) {
                if !bytes.is_empty() {
                    let b64 = base64_encode(&bytes);
                    return Ok(format!("data:audio/mp3;base64,{}", b64));
                }
            }
        }

        let encoded_text: String = text
            .chars()
            .map(|c| match c {
                ' ' => "+".to_string(),
                'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
                _ => {
                    let mut b = [0u8; 4];
                    let s = c.encode_utf8(&mut b);
                    s.bytes().map(|byte| format!("%{:02X}", byte)).collect()
                }
            })
            .collect();

        let url = format!(
            "https://translate.google.com/translate_tts?ie=UTF-8&tl={}&client=tw-ob&q={}",
            lang, encoded_text
        );

        let wide_url = to_wide(&url);
        let wide_path = to_wide(&file_path.to_string_lossy());

        unsafe {
            let hr = URLDownloadToFileW(
                std::ptr::null_mut(),
                wide_url.as_ptr(),
                wide_path.as_ptr(),
                0,
                std::ptr::null_mut(),
            );

            if hr != 0 {
                return Err(format!(
                    "URLDownloadToFileW failed with HRESULT: 0x{:08X}",
                    hr
                ));
            }
        }

        let bytes = fs::read(&file_path)
            .map_err(|e| format!("Failed to read downloaded audio file: {}", e))?;
        if bytes.is_empty() {
            return Err("Downloaded audio file is empty".to_string());
        }

        let b64 = base64_encode(&bytes);
        Ok(format!("data:audio/mp3;base64,{}", b64))
    }

    fn base64_encode(data: &[u8]) -> String {
        const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
        for chunk in data.chunks(3) {
            let b0 = chunk[0];
            let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
            let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };

            result.push(CHARS[(b0 >> 2) as usize] as char);
            result.push(CHARS[(((b0 & 3) << 4) | (b1 >> 4)) as usize] as char);
            if chunk.len() > 1 {
                result.push(CHARS[(((b1 & 15) << 2) | (b2 >> 6)) as usize] as char);
            } else {
                result.push('=');
            }
            if chunk.len() > 2 {
                result.push(CHARS[(b2 & 63) as usize] as char);
            } else {
                result.push('=');
            }
        }
        result
    }
}

#[tauri::command]
fn fetch_tts_audio(text: String, lang: Option<String>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let l = lang.unwrap_or_else(|| "th".to_string());
        win_tts::download_and_get_base64(&text, &l)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (text, lang);
        Err("Native TTS audio fetching only implemented for Windows".to_string())
    }
}

fn start_gsi_http_server(app_handle: AppHandle, running: Arc<AtomicBool>) {
    thread::spawn(move || {
        let address = "127.0.0.1:3001";
        let server = match Server::http(address) {
            Ok(s) => {
                println!("[DotaAssist Rust GSI] Listening on http://{}", address);
                s
            }
            Err(err) => {
                eprintln!(
                    "[DotaAssist Rust GSI] Failed to bind to {}: {}",
                    address, err
                );
                app_handle.state::<desktop::DesktopState>().0.lock().unwrap().gsi_error =
                    Some(format!("GSI listener could not start on {address}: {err}. Close other DotaAssist instances or the browser development bridge, then restart."));
                let _ = app_handle.emit(
                    "desktop-status",
                    desktop::desktop_status(app_handle.clone()),
                );
                return;
            }
        };

        while running.load(Ordering::Relaxed) {
            // Non-blocking or short timeout recv
            match server.recv_timeout(Duration::from_millis(500)) {
                Ok(Some(mut request)) => {
                    let url = request.url().to_string();
                    if request.method() == &Method::Options {
                        let response = Response::empty(StatusCode(204)).with_header(
                            tiny_http::Header::from_bytes(
                                &b"Access-Control-Allow-Origin"[..],
                                &b"*"[..],
                            )
                            .unwrap(),
                        );
                        let _ = request.respond(response);
                    } else if request.method() == &Method::Get && url == "/health" {
                        let response =
                            Response::from_string("OK").with_status_code(StatusCode(200));
                        let _ = request.respond(response);
                    } else if request.method() == &Method::Post && (url == "/gsi" || url == "/") {
                        let mut body_str = String::new();
                        if let Err(e) = request.as_reader().read_to_string(&mut body_str) {
                            eprintln!("[DotaAssist Rust GSI] Error reading request body: {}", e);
                            let response = Response::empty(StatusCode(400));
                            let _ = request.respond(response);
                            continue;
                        }

                        if body_str.trim().is_empty() {
                            let response = Response::from_string("Missing JSON payload")
                                .with_status_code(StatusCode(400));
                            let _ = request.respond(response);
                            continue;
                        }

                        let payload = match serde_json::from_str::<Value>(&body_str) {
                            Ok(payload) => payload,
                            Err(e) => {
                                eprintln!("[DotaAssist Rust GSI] Error parsing JSON: {}", e);
                                let response = Response::from_string("Invalid JSON payload")
                                    .with_status_code(StatusCode(400));
                                let _ = request.respond(response);
                                continue;
                            }
                        };

                        if payload
                            .get("provider")
                            .and_then(|p| p.get("appid"))
                            .and_then(Value::as_u64)
                            != Some(570)
                        {
                            let _ = request.respond(
                                Response::from_string("Expected Dota 2 GSI provider appid 570")
                                    .with_status_code(StatusCode(400)),
                            );
                            continue;
                        }

                        if let Err(e) = app_handle.emit("gsi-update", payload) {
                            eprintln!("[DotaAssist Rust GSI] Error emitting payload: {}", e);
                        }

                        let response = Response::from_string("OK")
                            .with_status_code(StatusCode(200))
                            .with_header(
                                tiny_http::Header::from_bytes(
                                    &b"Access-Control-Allow-Origin"[..],
                                    &b"*"[..],
                                )
                                .unwrap(),
                            );
                        let _ = request.respond(response);
                    } else if url == "/gsi" || url == "/" {
                        let response = Response::from_string("Method Not Allowed")
                            .with_status_code(StatusCode(405));
                        let _ = request.respond(response);
                    } else {
                        let response = Response::empty(StatusCode(404));
                        let _ = request.respond(response);
                    }
                }
                Ok(None) => {}
                Err(e) => {
                    eprintln!("[DotaAssist Rust GSI] Server error: {}", e);
                }
            }
        }
        println!("[DotaAssist Rust GSI] Server stopped.");
    });
}

#[cfg(target_os = "windows")]
fn ensure_single_instance() {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    unsafe {
        #[link(name = "kernel32")]
        extern "system" {
            fn CreateMutexW(
                lpMutexAttributes: *mut std::ffi::c_void,
                bInitialOwner: i32,
                lpName: *const u16,
            ) -> *mut std::ffi::c_void;
            fn GetLastError() -> u32;
        }
        #[link(name = "user32")]
        extern "system" {
            fn FindWindowW(
                lpClassName: *const u16,
                lpWindowName: *const u16,
            ) -> *mut std::ffi::c_void;
            fn SetForegroundWindow(hWnd: *mut std::ffi::c_void) -> i32;
            fn ShowWindow(hWnd: *mut std::ffi::c_void, nCmdShow: i32) -> i32;
        }

        let mutex_name: Vec<u16> = OsStr::new("Global\\DotaAssistSingleInstanceMutex")
            .encode_wide()
            .chain(Some(0))
            .collect();

        let handle = CreateMutexW(std::ptr::null_mut(), 1, mutex_name.as_ptr());
        if GetLastError() == 183 {
            // ERROR_ALREADY_EXISTS = 183
            let win_title: Vec<u16> = OsStr::new("DotaAssist")
                .encode_wide()
                .chain(Some(0))
                .collect();
            let hwnd = FindWindowW(std::ptr::null(), win_title.as_ptr());
            if !hwnd.is_null() {
                ShowWindow(hwnd, 9); // SW_RESTORE
                SetForegroundWindow(hwnd);
            }
            std::process::exit(0);
        }
        let _ = handle;
    }
}

fn main() {
    #[cfg(target_os = "windows")]
    ensure_single_instance();

    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    tauri::Builder::default()
        .manage(desktop::DesktopState::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            toggle_overlay_window,
            desktop::desktop_status,
            desktop::set_overlay_hotkey,
            desktop::set_roshan_hotkey,
            desktop::set_tormentor_hotkey,
            desktop::set_auto_copy_clipboard,
            desktop::detect_dota_installations,
            desktop::install_gsi_config,
            scan_minimap,
            fetch_tts_audio
        ])
        .setup(move |app| {
            desktop::initialize(app.handle());
            let app_handle = app.handle().clone();
            start_gsi_http_server(app_handle, running_clone);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.set_always_on_top(false);
                #[cfg(debug_assertions)]
                let _ = window.open_devtools();
            }

            Ok(())
        })
        .on_window_event(move |_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Trigger shutdown of GSI background listener
                running.store(false, Ordering::Relaxed);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running DotaAssist Tauri application");
}
