# Testing — 152 Tests Passing (Preview, Native TBD)

## Command
`cd apps/dev-preview && npm install && npx vitest run` → 14 files, 152 tests.

## Breakdown
- notchMachine 24: 16 states, hover, click→expanding, collapse interrupt, listening→transcribing→thinking→speaking, notification, context
- adapters 25: OBS connect/scene/mute, platforms connect/title/category, game FSM (Fortnite→Roblox, Discord debounce 5s, unknown, override), creator style maxLength/emoji/unknown game, privacy shield, voice start/stop
- workflow 5: nodes/edges/version/types/JSON round-trip
- privacy 5: untrusted isolation, destructive approval, secret redaction, revocation
- screen 4: permission gate, DPI scaling, protected exclusion, arrow coords
- lifecycle 8: 11 events, lock blocks foreground, persist checkpoint, tray quit, autostart
- agent 6: intent routing, tool validation, verification, queue priority, untrusted external
- approval 5: 3 modes, askThenAct, actAndNotify, high-impact gated
- notchComponent 3: renders idle pill, shortcut, expand on click
- more 27: OBS templates, Twitch/Kick/YT distinctions, widgets, polling, chat moderation, creator overrides, teach mode, workflow FFmpeg, memory categories, installer, reduced-motion, DPI, OBS exclusion
- providers 8: mock streaming, chat requires config (never fake), history, active provider, list configs, OpenAI key missing, timeout abort
- voiceVision 10: voice permission required, insertText into input, cancelSpeech, vision permission, capture permission, toScreenCoords DPI, confidence gate, auto-hide 10s timeout/reset/suppress while typing/listening/pause
- connectors 12: registry list/connect/disconnect, Gmail mockSearch & OAuth required, MCP add/list/bad URL/stdio-requires-Tauri, permissions profile defaults & high-impact gated, automation blocked protected & permission required, workflow dryRun & compile, streaming Twitch/Youtube token required
- onboarding 5: 12 stages, autostart default off, visibility options, persistence, reducedMotion

## Native Windows Tests (Require Real PC — Documented in WINDOWS_NATIVE.md)
- Tray lifecycle, auto-hide 10s interaction-only, global shortcut Ctrl+Alt+Z, breathing transitions, multi-monitor/DPI, OBS live, Gmail live, Fortnite→Roblox live, workflow Teach→run, installer smoke.

## Results
All 152 preview tests pass (vitest jsdom). Windows native build `cargo check` pending on PC. No fake successes — providers without creds throw “Configuration required”.
