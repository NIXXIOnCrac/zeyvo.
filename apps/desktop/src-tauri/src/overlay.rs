use tauri::{AppHandle, Manager};

pub fn configure_position(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(w) = app.get_webview_window("notch") {
        // Position at top-center of primary monitor (DPI aware)
        // Use window API to center horizontally
        #[cfg(target_os = "windows")]
        {
            let _ = w.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 0, y: 0 }));
        }
        // Hide dashboard by default — background runtime continues
        if let Some(dash) = app.get_webview_window("dashboard") {
            let _ = dash.hide();
        }
        // Handle window close: hide, don't destroy (background continues)
        let notch_handle = w.clone();
        w.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = notch_handle.hide();
            }
        });
        if let Some(dash) = app.get_webview_window("dashboard") {
            let dash_handle = dash.clone();
            dash.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = dash_handle.hide();
                }
            });
        }
    }
    Ok(())
}

#[deprecated(note="Use configure_position instead")]
pub fn create_notch_window(_app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> { Ok(()) }
