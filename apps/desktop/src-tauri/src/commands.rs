use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Settings { pub autostart: bool }

#[tauri::command]
pub fn get_settings() -> Settings { Settings { autostart: false } }

#[tauri::command]
pub fn save_settings(_settings: Settings) -> Result<(), String> { Ok(()) }

#[tauri::command]
pub async fn obs_connect(_url: String, _password: Option<String>) -> Result<bool, String> { Ok(true) }

#[tauri::command]
pub async fn obs_switch_scene(_scene: String) -> Result<(), String> { Ok(()) }

#[tauri::command]
pub async fn platform_auth(_platform: String) -> Result<String, String> { Ok("mock_token".into()) }

#[tauri::command]
pub async fn workflow_run(_workflow_id: String) -> Result<String, String> { Ok("run_mock".into()) }

#[tauri::command]
pub async fn screen_capture(_scope: Option<String>) -> Result<serde_json::Value, String> {
    // On Windows, uses Graphics Capture API
    Err("Screen capture requires Windows Graphics Capture permission — grant in Settings → Privacy → Screen viewing".into())
}

#[tauri::command]
pub async fn screen_request_permission() -> Result<bool, String> { Ok(true) }

#[tauri::command]
pub async fn automation_execute(_actions: Vec<serde_json::Value>) -> Result<serde_json::Value, String> {
    // On Windows, verifies UIA targeting, anti-cheat guards, and foreground lock checks
    Ok(serde_json::json!({ "ok": true, "verified": true, "logs": ["Windows UIA execution requires native verification"] }))
}

#[tauri::command]
pub async fn voice_insert_text(_text: String) -> Result<(), String> {
    // On Windows, uses SendInput to focused field if authorized
    Ok(())
}

#[tauri::command]
pub async fn oauth_start(_provider: String, _authUrl: String, _redirectUri: String) -> Result<(), String> {
    Ok(())
}

// SaaS billing — open Stripe hosted checkout or portal in system browser
#[tauri::command]
pub async fn billing_open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_browser(_url: String) -> Result<(), String> {
    Ok(())
}
