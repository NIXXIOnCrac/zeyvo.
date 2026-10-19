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
    // keyring doesn't list — return empty, frontend caches
    Ok(vec![])
}
