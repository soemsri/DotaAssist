use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const DEFAULT_HOTKEY: &str = "Ctrl+Shift+F10";
#[derive(Clone, Serialize, Deserialize)]
pub struct Preferences {
    pub hotkey: String,
    pub dota_path: Option<String>,
}
impl Default for Preferences {
    fn default() -> Self {
        Self {
            hotkey: DEFAULT_HOTKEY.into(),
            dota_path: None,
        }
    }
}
#[derive(Default)]
pub struct DesktopState(pub Mutex<Runtime>);
#[derive(Default)]
pub struct Runtime {
    pub gsi_error: Option<String>,
    pub preferences: Preferences,
    pub overlay: bool,
    pub interactive: bool,
    pub hotkey_ready: bool,
    pub error: Option<String>,
}
#[derive(Clone, Serialize)]
pub struct DesktopStatus {
    pub hotkey: String,
    pub dota_path: Option<String>,
    pub interactive: bool,
    pub hotkey_ready: bool,
    pub error: Option<String>,
}
#[tauri::command]
pub fn desktop_status(app: AppHandle) -> DesktopStatus {
    let state = app.state::<DesktopState>();
    let s = state.0.lock().unwrap();
    DesktopStatus {
        hotkey: s.preferences.hotkey.clone(),
        dota_path: s.preferences.dota_path.clone(),
        interactive: s.interactive,
        hotkey_ready: s.hotkey_ready,
        error: match (&s.error, &s.gsi_error) {
            (Some(a), Some(b)) => Some(format!("{a} {b}")),
            (a, b) => a.clone().or_else(|| b.clone()),
        },
    }
}
fn save(app: &AppHandle, prefs: &Preferences) -> Result<(), String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(
        dir.join("desktop.json"),
        serde_json::to_vec_pretty(prefs).unwrap(),
    )
    .map_err(|e| e.to_string())
}
fn register(app: &AppHandle, shortcut: Shortcut) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(shortcut, |app, _, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }
            let state = app.state::<DesktopState>();
            let mut s = state.0.lock().unwrap();
            if !s.overlay {
                return;
            }
            if let Some(window) = app.get_webview_window("main") {
                let next = !s.interactive;
                match window.set_ignore_cursor_events(!next) {
                    Ok(()) => {
                        s.interactive = next;
                        s.error = None;
                    }
                    Err(e) => {
                        s.error = Some(e.to_string());
                    }
                }
            }
            drop(s);
            let _ = app.emit("desktop-status", desktop_status(app.clone()));
        })
        .map_err(|e| e.to_string())
}
pub fn initialize(app: &AppHandle) {
    let prefs = app
        .path()
        .app_config_dir()
        .ok()
        .and_then(|p| fs::read(p.join("desktop.json")).ok())
        .and_then(|v| serde_json::from_slice::<Preferences>(&v).ok())
        .unwrap_or_default();
    let result = prefs
        .hotkey
        .parse::<Shortcut>()
        .map_err(|e| e.to_string())
        .and_then(|s| register(app, s));
    let state = app.state::<DesktopState>();
    let mut s = state.0.lock().unwrap();
    s.preferences = prefs;
    s.hotkey_ready = result.is_ok();
    s.error = result.err();
}
#[tauri::command]
pub fn set_overlay_hotkey(app: AppHandle, hotkey: String) -> Result<DesktopStatus, String> {
    let shortcut = hotkey.parse::<Shortcut>().map_err(|e| e.to_string())?;
    if shortcut.mods.is_empty() {
        return Err("Use a modifier such as Ctrl or Alt with the key.".into());
    }
    let state = app.state::<DesktopState>();
    let mut s = state.0.lock().unwrap();
    let old = s.preferences.hotkey.parse::<Shortcut>().ok();
    if old == Some(shortcut) && s.hotkey_ready {
        drop(s);
        return Ok(desktop_status(app));
    }
    register(&app, shortcut)?;
    let mut prefs = s.preferences.clone();
    prefs.hotkey = hotkey;
    if let Err(e) = save(&app, &prefs) {
        let _ = app.global_shortcut().unregister(shortcut);
        return Err(e);
    }
    if s.hotkey_ready {
        if let Some(old) = old {
            let _ = app.global_shortcut().unregister(old);
        }
    }
    s.preferences = prefs;
    s.hotkey_ready = true;
    s.error = None;
    drop(s);
    let status = desktop_status(app.clone());
    let _ = app.emit("desktop-status", &status);
    Ok(status)
}

// Steam's libraryfolders.vdf contains quoted path values with escaped backslashes.
fn library_paths(text: &str) -> Vec<PathBuf> {
    text.lines()
        .filter_map(|line| {
            let parts: Vec<_> = line.split('"').collect();
            if parts.len() >= 4 && (parts[1] == "path" || parts[1].parse::<u32>().is_ok()) {
                let value = parts[3].replace("\\\\", "\\");
                if value.contains(':') || value.starts_with('/') {
                    return Some(PathBuf::from(value));
                }
            }
            None
        })
        .collect()
}
#[tauri::command]
pub fn detect_dota_installations() -> Vec<String> {
    let mut roots = Vec::new();
    for key in ["ProgramFiles(x86)", "ProgramFiles"] {
        if let Some(path) = std::env::var_os(key) {
            roots.push(PathBuf::from(path).join("Steam"));
        }
    }
    #[cfg(target_os = "windows")]
    if let Ok(output) = std::process::Command::new("reg")
        .args(["query", r"HKCU\Software\Valve\Steam", "/v", "SteamPath"])
        .output()
    {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            if let Some((_, path)) = line.split_once("REG_SZ") {
                roots.push(PathBuf::from(path.trim()));
            }
        }
    }
    let mut libraries = roots.clone();
    for root in roots {
        if let Ok(text) = fs::read_to_string(root.join("steamapps/libraryfolders.vdf")) {
            libraries.extend(library_paths(&text));
        }
    }
    let mut paths: Vec<_> = libraries
        .into_iter()
        .map(|p| p.join("steamapps/common/dota 2 beta"))
        .filter(|p| p.join("game/dota/gameinfo.gi").is_file())
        .map(|p| p.to_string_lossy().into_owned())
        .collect();
    paths.sort();
    paths.dedup();
    paths
}
#[derive(Serialize)]
pub struct InstallResult {
    config_path: String,
    backup_path: Option<String>,
}
fn install_config(root: &Path) -> Result<InstallResult, String> {
    if !root.join("game/dota/gameinfo.gi").is_file() {
        return Err(
            "Select the Dota 2 installation folder containing game/dota/gameinfo.gi.".into(),
        );
    }
    let directory = root.join("game/dota/cfg/gamestate_integration");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let config = directory.join("gamestate_integration_dotaassist.cfg");
    let mut backup = None;
    if config.exists() {
        // create_new prevents overwriting any earlier backup, even in the same second.
        for index in 1.. {
            let path = directory.join(format!("gamestate_integration_dotaassist.cfg.bak.{index}"));
            match fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&path)
            {
                Ok(mut file) => {
                    let mut original = fs::File::open(&config).map_err(|e| e.to_string())?;
                    std::io::copy(&mut original, &mut file).map_err(|e| e.to_string())?;
                    file.sync_all().map_err(|e| e.to_string())?;
                    backup = Some(path.to_string_lossy().into_owned());
                    break;
                }
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(e) => return Err(e.to_string()),
            }
        }
    }
    fs::write(
        &config,
        include_str!("../../public/gamestate_integration_dotaassist.cfg"),
    )
    .map_err(|e| e.to_string())?;
    Ok(InstallResult {
        config_path: config.to_string_lossy().into_owned(),
        backup_path: backup,
    })
}
#[tauri::command]
pub fn install_gsi_config(app: AppHandle, dota_path: String) -> Result<InstallResult, String> {
    let result = install_config(Path::new(&dota_path))?;
    let state = app.state::<DesktopState>();
    let mut s = state.0.lock().unwrap();
    let mut prefs = s.preferences.clone();
    prefs.dota_path = Some(dota_path);
    save(&app, &prefs)
        .map_err(|e| format!("Configuration installed, but preferences could not be saved: {e}"))?;
    s.preferences = prefs;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn finds_additional_steam_libraries() {
        assert_eq!(
            library_paths("\"path\" \"D:\\\\SteamLibrary\""),
            vec![PathBuf::from(r"D:\SteamLibrary")]
        );
    }
    #[test]
    fn validates_installation_and_preserves_each_backup() {
        let root = std::env::temp_dir().join(format!("dotaassist-test-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        assert!(install_config(&root).is_err());
        fs::create_dir_all(root.join("game/dota")).unwrap();
        fs::write(root.join("game/dota/gameinfo.gi"), "test").unwrap();
        let first = install_config(&root).unwrap();
        assert!(first.backup_path.is_none());
        fs::write(&first.config_path, "user configuration").unwrap();
        let second = install_config(&root).unwrap();
        assert_eq!(
            fs::read_to_string(second.backup_path.unwrap()).unwrap(),
            "user configuration"
        );
        assert!(install_config(&root)
            .unwrap()
            .backup_path
            .unwrap()
            .ends_with("bak.2"));
        fs::remove_dir_all(root).unwrap();
    }
}
