// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tiny_http::{Response, Server, StatusCode};

#[tauri::command]
fn toggle_overlay_window(window: WebviewWindow, overlay: bool) -> Result<(), String> {
    if overlay {
        let _ = window.set_always_on_top(true);
        let _ = window.set_decorations(false);
    } else {
        let _ = window.set_always_on_top(true);
        let _ = window.set_decorations(true);
    }
    let _ = window.set_focus();
    Ok(())
}

fn start_gsi_http_server(app_handle: AppHandle, running: Arc<AtomicBool>) {
    thread::spawn(move || {
        let address = "127.0.0.1:3000";
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
                return;
            }
        };

        while running.load(Ordering::Relaxed) {
            // Non-blocking or short timeout recv
            match server.recv_timeout(Duration::from_millis(500)) {
                Ok(Some(mut request)) => {
                    let url = request.url().to_string();
                    if url == "/gsi" || url == "/" {
                        let mut body_str = String::new();
                        if let Err(e) = request.as_reader().read_to_string(&mut body_str) {
                            eprintln!("[DotaAssist Rust GSI] Error reading request body: {}", e);
                            let response = Response::empty(StatusCode(400));
                            let _ = request.respond(response);
                            continue;
                        }

                        if !body_str.trim().is_empty() {
                            match serde_json::from_str::<Value>(&body_str) {
                                Ok(payload) => {
                                    let _ = app_handle.emit("gsi-update", payload);
                                }
                                Err(e) => {
                                    eprintln!("[DotaAssist Rust GSI] Error parsing JSON: {}", e);
                                }
                            }
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
        .invoke_handler(tauri::generate_handler![toggle_overlay_window])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            start_gsi_http_server(app_handle, running_clone);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.set_always_on_top(true);
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
