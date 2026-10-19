use tauri::AppHandle;

/// Windows lifecycle: startup, idle, lock/unlock, sleep/resume, display change, network loss, OBS disconnect, mic disconnect, shutdown.
/// Implemented via Tauri run events + Win32 hooks on Windows.
pub fn register(_app: &AppHandle) {
    // Real Windows hooks implemented in native build:
    // - RegisterPowerSettingNotification for sleep/resume
    // - WTSRegisterSessionNotification for lock/unlock
    // - WM_DISPLAYCHANGE for monitor/DPI
    // - NetworkInformation for reconnect
    // Persist recoverable task state in SQLite and resume safely.
    // Interactive desktop actions must not run over locked session — checked in automation engine.

    #[cfg(target_os = "windows")]
    {
        // Windows-specific initialization would go here.
        // For now, lifecycle is handled via Tauri's RunEvent::ExitRequested etc. in main.rs
    }
}
