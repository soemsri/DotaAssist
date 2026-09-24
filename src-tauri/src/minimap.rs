use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Display {
    name: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    scale: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Selection {
    pub monitor: usize,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}
#[derive(Clone, Serialize, Deserialize)]
struct Calibration {
    displays: Vec<Display>,
    selection: Selection,
    reference: Vec<f32>,
}
static PENDING: Mutex<Option<Calibration>> = Mutex::new(None);

#[tauri::command]
pub fn minimap_displays(app: AppHandle) -> Result<Vec<Display>, String> {
    app.available_monitors()
        .map_err(|e| e.to_string())
        .map(|ms| {
            ms.iter()
                .map(|m| Display {
                    name: m.name().cloned().unwrap_or_else(|| "Monitor".into()),
                    x: m.position().x,
                    y: m.position().y,
                    width: m.size().width,
                    height: m.size().height,
                    scale: m.scale_factor(),
                })
                .collect()
        })
}
fn path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("minimap.json"))
}
fn load(app: &AppHandle) -> Result<Calibration, String> {
    serde_json::from_slice(
        &std::fs::read(path(app)?).map_err(|_| "Calibrate the minimap in Settings")?,
    )
    .map_err(|_| "Recalibrate the minimap in Settings".into())
}
fn bounds(s: &Selection, ds: &[Display]) -> Result<(i32, i32), String> {
    let d = ds.get(s.monitor).ok_or("Select a connected monitor")?;
    if s.width < 100
        || s.height < 100
        || s.width > 1024
        || s.height > 1024
        || s.x.checked_add(s.width).is_none_or(|v| v > d.width)
        || s.y.checked_add(s.height).is_none_or(|v| v > d.height)
        || (s.width as f64 / s.height as f64 - 1.0).abs() > 0.2
    {
        return Err(
            "Select a nearly square minimap rectangle, 100–1024 pixels, inside the monitor".into(),
        );
    }
    Ok((d.x + s.x as i32, d.y + s.y as i32))
}
fn capture(s: &Selection, ds: &[Display]) -> Result<(Vec<u8>, usize, usize), String> {
    let (x, y) = bounds(s, ds)?;
    #[cfg(target_os = "windows")]
    {
        super::win_capture::capture_rect(x, y, s.width as i32, s.height as i32)
            .ok_or("Capture failed; recalibrate in Settings".into())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (x, y);
        Err("Minimap capture requires Windows".into())
    }
}
// Coarse spatial color signature: a conservative image-consistency gate, not a probability.
fn signature(p: &[u8], w: usize, h: usize) -> Vec<f32> {
    let mut out = vec![0.0; 8 * 8 * 3];
    let mut counts = [0usize; 64];
    for y in 0..h {
        for x in 0..w {
            let tile = (y * 8 / h) * 8 + x * 8 / w;
            counts[tile] += 1;
            for c in 0..3 {
                out[tile * 3 + c] += p[(y * w + x) * 4 + c] as f32 / 255.0;
            }
        }
    }
    for i in 0..64 {
        for c in 0..3 {
            out[i * 3 + c] /= counts[i].max(1) as f32;
        }
    }
    out
}
fn usable(s: &[f32]) -> bool {
    let mean = s.iter().sum::<f32>() / s.len() as f32;
    let variance = s.iter().map(|v| (v - mean).powi(2)).sum::<f32>() / s.len() as f32;
    mean > 0.025 && mean < 0.9 && variance > 0.002
}
fn consistent(reference: &[f32], current: &[f32]) -> bool {
    reference.len() == 192
        && current.len() == 192
        && usable(current)
        && reference
            .iter()
            .zip(current)
            .map(|(a, b)| (a - b).abs())
            .sum::<f32>()
            / 192.0
            < 0.10
}
#[derive(Serialize)]
pub struct Preview {
    pixels: Vec<u8>,
    width: usize,
    height: usize,
}
#[tauri::command]
pub fn preview_minimap(app: AppHandle, selection: Selection) -> Result<Preview, String> {
    *PENDING.lock().unwrap() = None;
    let displays = minimap_displays(app)?;
    let (mut pixels, width, height) = capture(&selection, &displays)?;
    let reference = signature(&pixels, width, height);
    if !usable(&reference) {
        return Err("Preview lacks minimap detail. Show the game and adjust the rectangle.".into());
    }
    *PENDING.lock().unwrap() = Some(Calibration {
        displays,
        selection,
        reference,
    });
    for p in pixels.chunks_exact_mut(4) {
        p.swap(0, 2);
        p[3] = 255;
    }
    Ok(Preview {
        pixels,
        width,
        height,
    })
}
#[tauri::command]
pub fn confirm_minimap(app: AppHandle) -> Result<(), String> {
    let mut pending = PENDING.lock().unwrap();
    let c = pending
        .as_ref()
        .ok_or("Capture and verify a preview first")?;
    if c.displays != minimap_displays(app.clone())? {
        return Err("Displays changed; capture a new preview".into());
    }
    let p = path(&app)?;
    std::fs::create_dir_all(p.parent().unwrap()).map_err(|e| e.to_string())?;
    std::fs::write(p, serde_json::to_vec(c).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    *pending = None;
    Ok(())
}
#[tauri::command]
pub fn minimap_calibration_status(app: AppHandle) -> Result<Selection, String> {
    let c = load(&app)?;
    if c.displays != minimap_displays(app.clone())? {
        let _ = std::fs::remove_file(path(&app)?);
        return Err("Display settings changed. Revalidate the minimap preview in Settings.".into());
    }
    bounds(&c.selection, &c.displays)?;
    Ok(c.selection)
}
pub fn calibrated_capture(app: &AppHandle) -> Result<(Vec<u8>, usize, usize), String> {
    let c = load(app)?;
    if c.displays != minimap_displays(app.clone())? {
        let _ = std::fs::remove_file(path(app)?);
        return Err("Display settings changed. Recalibrate in Settings.".into());
    }
    #[cfg(target_os = "windows")]
    if !super::win_capture::game_foreground() {
        return Err("Dota 2 is not foreground; scanning unavailable".into());
    }
    let (p, w, h) = capture(&c.selection, &c.displays)?;
    if !consistent(&c.reference, &signature(&p, w, h)) {
        return Err("Low scan confidence. Uncover the minimap or recalibrate in Settings.".into());
    }
    Ok((p, w, h))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_blank_and_changed_frames() {
        let r: Vec<f32> = (0..192)
            .map(|i| if i % 2 == 0 { 0.1 } else { 0.5 })
            .collect();
        assert!(consistent(&r, &r));
        assert!(!consistent(&r, &vec![0.0; 192]));
        assert!(!consistent(
            &r,
            &r.iter().map(|v| v + 0.3).collect::<Vec<_>>()
        ));
    }
    #[test]
    fn validates_monitor_bounds_and_overflow() {
        let ds = vec![Display {
            name: "Secondary".into(),
            x: -1920,
            y: 0,
            width: 1920,
            height: 1080,
            scale: 1.0,
        }];
        let mut s = Selection {
            monitor: 0,
            x: 0,
            y: 800,
            width: 250,
            height: 250,
        };
        assert_eq!(bounds(&s, &ds).unwrap(), (-1920, 800));
        s.x = u32::MAX;
        assert!(bounds(&s, &ds).is_err());
        s.x = 1800;
        assert!(bounds(&s, &ds).is_err());
        s.monitor = 1;
        assert!(bounds(&s, &ds).is_err());
    }
}
