#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod tray;
mod overlay;
mod lifecycle;
mod commands;
mod secure;
mod db;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("notch") { let _ = w.show(); let _ = w.set_focus(); }
        }))
        .setup(|app| {
            tray::setup(app.handle())?;
            overlay::configure_position(app.handle())?;
            lifecycle::register(app.handle());

            // Global hotkey Ctrl+Alt+Z — open/close notch (single source of truth, configurable later)
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};
                let app_handle = app.handle().clone();
                app.global_shortcut().on_shortcut(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyZ), move |_app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(w) = app_handle.get_webview_window("notch") {
                            let visible = w.is_visible().unwrap_or(false);
                            if visible {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                }).ok();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::obs_connect,
            commands::obs_switch_scene,
            commands::platform_auth,
            commands::workflow_run,
            commands::screen_capture,
            commands::screen_request_permission,
            commands::automation_execute,
            commands::voice_insert_text,
            commands::oauth_start,
            commands::open_browser,
            secure::secure_set,
            secure::secure_get,
            secure::secure_delete,
            secure::secure_list,
            db::db_execute,
            db::db_select,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
