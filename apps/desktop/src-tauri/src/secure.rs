use keyring::Entry;

#[tauri::command]
pub fn secure_set(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new("zeyvo", &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn secure_get(key: String) -> Result<Option<String>, String> {
    let entry = Entry::new("zeyvo", &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(p) => Ok(Some(p)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn secure_delete(key: String) -> Result<(), String> {
    let entry = Entry::new("zeyvo", &key).map_err(|e| e.to_string())?;
    let _ = entry.delete_credential();
    Ok(())
}

#[tauri::command]
pub fn secure_list() -> Result<Vec<String>, String> {
    Ok(vec![])
}

// --- SaaS auth: persist Supabase session securely (Windows Credential Manager, not plaintext) ---
#[tauri::command]
pub fn store_session(access_token: String, refresh_token: String) -> Result<(), String> {
    Entry::new("zeyvo","supabase_access_token").map_err(|e| e.to_string())?.set_password(&access_token).map_err(|e| e.to_string())?;
    Entry::new("zeyvo","supabase_refresh_token").map_err(|e| e.to_string())?.set_password(&refresh_token).map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub fn load_session() -> Result<(String,String), String> {
    let at = Entry::new("zeyvo","supabase_access_token").map_err(|e| e.to_string())?.get_password().map_err(|e| e.to_string())?;
    let rt = Entry::new("zeyvo","supabase_refresh_token").map_err(|e| e.to_string())?.get_password().map_err(|e| e.to_string())?;
    Ok((at,rt))
}
#[tauri::command]
pub fn clear_session() -> Result<(), String> {
    let _ = Entry::new("zeyvo","supabase_access_token").map_err(|e| e.to_string())?.delete_credential();
    let _ = Entry::new("zeyvo","supabase_refresh_token").map_err(|e| e.to_string())?.delete_credential();
    Ok(())
}
