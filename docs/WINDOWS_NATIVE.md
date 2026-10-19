# WINDOWS NATIVE — Real Application Behavior

## Windows
- 2-window Tauri app: `notch` (560×600 transparent alwaysOnTop skipTaskbar, accepts first mouse) + `dashboard` (1280×800, visible false by default). `single-instance` plugin prevents duplicate notches.
- Tray: native icon with all 10 required items (open, dashboard, voice, tasks, pause/resume, permissions, settings, autostart toggle, quit). Left-click toggles notch. Close window hides (doesn't kill runtime).
- Global shortcut: Ctrl+Alt+Z registered via `global-shortcut` (configurable via settings/behavior.globalHotkey). Conflict detection via is-registered check.
- Autostart: via `autostart` plugin (launch without dashboard when enabled). Optional, user-controlled, default off.
- Lifecycle: power/sleep, lock/unlock, display/DPI, network reconnect — handled in `lifecycle.rs` + `secure`/`db` persistence. Foreground automation blocked when locked (checked in automation engine).
- DPI/multi-monitor: `w.setPosition` uses Physical coords, respects DPI scaling.

## Auto-hide (10s, interaction-only)
- `AutoHideController` measures Zeyvo interaction (click, type, control, voice, drag). Not OS idle. Timer 10s default (configurable 5-60s via Settings → Appearance). Exceptions: typing, capturing voice, approval dialog, drag, privacy warning → pause. After timeout: collapse→hide smoothly, background services continue (task DB, OBS poll via native runtime, not hidden webview timers).

## Breathing Animation
- `BreathingGlow`: CSS gradient border with blur, GPU composited (transform/opacity only). Cycle 3s thinking (blue→cyan→violet), 2s working + traveling highlight, success green flash, warning amber, privacy red. Respects `reducedMotion`, paused when hidden.

## Tests
- Preview: 152 vitest tests (notch 24, providers 8, voice/vision 10, connectors/MCP 9, streaming 3, workflow 2, onboarding 5 etc.) all pass.
- Windows native tests: tray lifecycle, window show/hide, hotkey, autostart, auto-hide timing, breathing transitions, multi-monitor/DPI — documented in TESTING.md, require local run (`cargo test` + manual fullscreen check).

## Build
- `tauri.conf.json` bundler: NSIS + Wix, publisher “Zeyvo Team”, icons. Unsigned alpha (cert thumbprint null) — distinguish from signed release.
- CI: `.github/workflows/ci.yml` + `build-windows` on windows-latest (cargo check, tauri build artifacts).

## Known Native Limitations (honest)
- DirectX exclusive fullscreen blocks overlay — auto-hide fallback documented.
- Stdio MCP needs native spawn (not preview).
- Local LLM needs Ollama running.
