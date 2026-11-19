#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Bible App: offline-first Khmer Bible desktop application.
/// The native backend stays in this single Rust source file.
/// The first milestone uses bundled Scripture and local-only web storage.
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to launch Bible App");
}
