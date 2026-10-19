use tauri::{AppHandle, Manager, menu::{Menu, MenuItem, PredefinedMenuItem}, tray::{TrayIconBuilder, TrayIconEvent}, Emitter};

pub fn setup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open = MenuItem::with_id(app, "open", "Open Zeyvo", true, None::<&str>)?;
    let dashboard = MenuItem::with_id(app, "dashboard", "Open Dashboard", true, None::<&str>)?;
    let voice = MenuItem::with_id(app, "voice", "Start Voice Interaction", true, None::<&str>)?;
    let tasks = MenuItem::with_id(app, "tasks", "Active Tasks", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pause AI", true, None::<&str>)?;
    let resume = MenuItem::with_id(app, "resume", "Resume AI", true, None::<&str>)?;
    let permissions = MenuItem::with_id(app, "permissions", "Permissions", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let autostart = MenuItem::with_id(app, "autostart", "Start with Windows", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Zeyvo", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&open, &dashboard, &sep1, &voice, &tasks, &pause, &resume, &sep2, &permissions, &settings, &autostart, &quit])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Zeyvo — Your companion")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "open" => { if let Some(w) = app.get_webview_window("notch") { let _ = w.show(); let _ = w.set_focus(); } },
                "dashboard" => {
                    if let Some(w) = app.get_webview_window("dashboard") { let _ = w.show(); let _ = w.set_focus(); }
                    else if let Some(w) = app.get_webview_window("notch") { let _ = w.emit("open-dashboard", ()); }
                },
                "voice" => { if let Some(w) = app.get_webview_window("notch") { let _ = w.show(); let _ = w.emit("start-voice", ()); } },
                "tasks" => { if let Some(w) = app.get_webview_window("dashboard") { let _ = w.show(); let _ = w.emit("open-tasks", ()); } },
                "pause" => { if let Some(w) = app.get_webview_window("notch") { let _ = w.emit("pause-ai", ()); } },
                "resume" => { if let Some(w) = app.get_webview_window("notch") { let _ = w.emit("resume-ai", ()); } },
                "permissions" => { if let Some(w) = app.get_webview_window("dashboard") { let _ = w.show(); let _ = w.emit("open-permissions", ()); } },
                "settings" => { if let Some(w) = app.get_webview_window("dashboard") { let _ = w.show(); let _ = w.emit("open-settings", ()); } },
                "autostart" => { // toggle autostart via tauri plugin
                    // handled in frontend via invoke
                    if let Some(w) = app.get_webview_window("dashboard") { let _ = w.emit("toggle-autostart", ()); }
                },
                "quit" => {
                    // Graceful shutdown: cancel/persist tasks, release hotkeys, stop mic
                    app.exit(0);
                },
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button, .. } = event {
                if button == tauri::tray::MouseButton::Left {
                    let app = tray.app_handle();
                    if let Some(w) = app.get_webview_window("notch") {
                        let is_visible = w.is_visible().unwrap_or(false);
                        if is_visible { let _ = w.hide(); } else { let _ = w.show(); let _ = w.set_focus(); }
                    }
                }
            }
        })
        .build(app)?;
    Ok(())
}
