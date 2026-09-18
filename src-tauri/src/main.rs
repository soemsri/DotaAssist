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

fn main() {
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    tauri::Builder::default()
        .manage(desktop::DesktopState::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            toggle_overlay_window,
            desktop::desktop_status,
            desktop::set_overlay_hotkey,
            desktop::detect_dota_installations,
            desktop::install_gsi_config
        ])
        .setup(move |app| {
            desktop::initialize(app.handle());
            let app_handle = app.handle().clone();
            start_gsi_http_server(app_handle, running_clone);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.set_always_on_top(false);
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
