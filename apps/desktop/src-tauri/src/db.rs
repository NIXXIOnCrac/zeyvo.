use serde::Serialize;

#[derive(Serialize)]
pub struct Row { _placeholder: u8 }

#[tauri::command]
pub async fn db_execute(_sql: String, _params: Option<Vec<serde_json::Value>>) -> Result<(), String> {
    // Real impl uses tauri-plugin-sql managed connection; here we forward via JS side or use plugin's JS API directly.
    // On Windows, frontend should use @tauri-apps/plugin-sql Database class instead of invoke.
    Ok(())
}

#[tauri::command]
pub async fn db_select(_sql: String, _params: Option<Vec<serde_json::Value>>) -> Result<Vec<serde_json::Value>, String> {
    Ok(vec![])
}
