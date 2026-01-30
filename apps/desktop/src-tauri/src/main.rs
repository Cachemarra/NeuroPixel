// LumaGraph Desktop - Tauri v2 Application
// Wraps the React web-client and manages the Python sidecar

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    lumagraph_lib::run()
}
