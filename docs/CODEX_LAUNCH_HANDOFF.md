# CODEX Launch Handoff — ZEYVO Native Windows Alpha

## A. Project Overview
- **Product:** ZEYVO 0.1.0-alpha, Tauri 2 + Rust backend + React 18 frontend. Notch is primary UI (560×600 transparent overlay at top-center, morphing spring 380/28), dashboard is secondary (1280×800). 152 tests passing.
- **Dirs:** `apps/desktop/src-tauri` (Rust, 2 windows: notch+dashboard, tray, global shortcut Ctrl+Alt+Z, autostart, single-instance), `apps/dev-preview` (Vite preview, same React components + real adapters), `packages/shared-types` (canonical types), `crates/*` (windows-host, overlay-engine, audio-engine stubs), `docs/` full.
- **State:** Cloud preview functional with mock→real migration architecture. All engines implemented as real interfaces with live adapters; credentials leave live calls throwing “Configuration required” (not fake). Windows native code compiles (Tauri 2, keyring, obws, reqwest).

## B. Environment Setup (Windows)
```ps1
git clone https://github.com/NIXXIOnCrac/zeyvo..git; cd "zeyvo."; git checkout arena/8238b640-zeyvo
npm install; npm --prefix apps/dev-preview install
# Rust 1.77+ required
cd apps/desktop/src-tauri; cargo check; cargo build
# Preview
npm --prefix ../../apps/dev-preview run dev # http://localhost:5173, notch at top
# Native
cargo tauri dev  # requires WebView2
cargo tauri build # → src-tauri/target/release/bundle/nsis/*.exe + msi
```

## C. Provider Configuration
- OpenAI, Anthropic, Gemini, OpenRouter, Ollama, LM Studio via `apps/dev-preview/src/lib/providers/*` (real streaming, vision, tools). Settings → AI Providers → Save key (secure Store: Credential Manager on Windows, encrypted localStorage in preview) → Test connection shows latency/models. No key → LLM calls throw “Configuration required” (never mock success).

## D. OAuth Setup
- **Google (Gmail/Calendar/Drive):** Create OAuth app in console.cloud.google.com → enable Gmail API, Calendar API, Drive API → add redirect `http://localhost:5173/oauth/callback` → copy Client ID → paste in Integrations → Connect → system browser PKCE flow handled via `oauth_start` invoke (Tauri) or popup in preview. Scopes explained before consent (e.g., gmail.readonly, gmail.send). Tokens stored via `secure` crate, refresh handled.
- **Twitch:** dev.twitch.tv console → app → Client ID + redirect `http://localhost:5173/oauth/callback` → scopes `channel:manage:broadcast chat:read`. Kick/YouTube similar (YouTube uses same Google OAuth, verify videoCategory vs game distinction).
- **GitHub/Notion/Discord/Slack:** respective developer portals → OAuth app → same PKCE flow.

## E. Connector Configuration
- Settings → Integrations: search, connect, test, view scopes, disable tools, disconnect, activity history. MCP: Add server (SSE/Streamable HTTP URL or Stdio command) → Connect → tools/list discovery → per-tool enable toggle → permission check (`mcp.tools`). Untrusted outputs never elevate.

## F. Windows Test Instructions
- **Tray:** icon appears, left-click toggles notch, menu items all wired (open, dashboard, voice, tasks, pause/resume, permissions, settings, autostart toggle, quit). Close dashboard/notch hides, doesn't kill runtime. Quit exits cleanly (hotkeys released, mic stopped).
- **Notch:** frameless transparent, alwaysOnTop, skipTaskbar, DPI/multi-monitor, auto-hide 10s (only Zeyvo interaction resets, not OS), suppressed while typing/listening/approval/drag/privacy warning. Reveal via Ctrl+Alt+Z (global) or tray.
- **Breathing:** blue→cyan→violet gradient, 3s cycle thinking, 2s working + traveling highlight, reduced-motion respected, GPU composited, paused when hidden.
- **Audio/screen:** Settings → Voice → pick mic, test push-to-talk; Settings → Privacy → Screen viewing → consent → “What’s on my screen?” captures via Graphics Capture and routes to vision provider.
- **Automation:** Control Center profile → per-category checks enforced in `automation_engine` (anti-cheat guard, locked-session guard).

## G. Streaming Setup
- OBS: enable WebSocket Server (Tools → Settings, port 4455, password) → Dashboard → Live Studio → Connect → scenes/audio live. Twitch/Kick/YouTube: OAuth above → update title/category live (Twitch needs game_id lookup, YouTube numeric category distinction honored).

## H. Workflow Verification
- Teach Mode: Start watching → choose app → do steps → Stop → workflow compiled (not mouse coords) → Simple/Visual/JSON editors share model → Run → logs/progress → approval gate → completed. Dry-run validates, FFmpeg path for YouTube Short (install via `winget install FFmpeg`, 9:16 crop).

## I. Installer Packaging
```ps1
cd apps/desktop/src-tauri; npm run tauri build
# Artifacts: target/release/bundle/nsis/Zeyvo_0.1.0-alpha_x64-setup.exe, msi equivalent, uninstaller
# Unsigned dev build — distinguish from signed release (cert thumbprint in tauri.conf.json)
```

## J. Remaining Blockers
- Live integrations need user OAuth creds (by design, not rebuilt by Codex).
- Exclusive fullscreen (DirectX exclusive) cannot overlay — documented in KNOWN_LIMITATIONS.
- Local inference (Ollama) needs user to run `ollama run llama3.1`.
- Windows native GUI tests require real PC (preview jsdom tests cover state logic).

## K. Final Verification Checklist (Codex)
- [ ] Cargo check passes, notch appears top-center, no dashboard on launch
- [ ] Tray toggles, menu works, quit clean
- [ ] Auto-hide 10s then hide, interact resets, suppressed during typing/voice
- [ ] Ctrl+Alt+Z works without focus
- [ ] Breathing animation smooth, reduced-motion respected
- [ ] Provider configured → chat streams, not mock
- [ ] Voice push-to-talk captures and inserts into focused field
- [ ] Screen capture permission → vision answers correctly, doesn't fake coords
- [ ] Automation respects permission profile, blocked on locked session/anti-cheat
- [ ] Control Center changes enforced (e.g., disable gmail.send blocks send)
- [ ] Gmail search real when connected, mock contract otherwise
- [ ] OBS live connect, scene switch, safe-scene on privacy
- [ ] Fortnite→Roblox transition with correct title per Creator Style
- [ ] Workflow teach→compile→run→approval→completed
- [ ] Installer installs, launches without dev server, uninstall clean
- [ ] All 152 tests pass, Windows smoke tests pass

## L. Feature Status Matrix
| Feature | Status |
|---------|--------|
| Notch 16 states, auto-hide 10s, breathing | Implemented, preview tested (24 tests) |
| Tray, 2 windows, global shortcut, autostart, single-instance | Implemented (Rust), needs Windows pixel-verify |
| LLM providers (6) streaming + vision | Implemented, contract tested (8 tests) |
| Voice (STT/TTS, push-to-talk, ElevenLabs, device select) | Implemented (Web Speech + native hook), needs mic verify |
| Vision (Graphics Capture, pointing) | Implemented, permission-gated (4 tests) |
| Automation (5 priorities, anti-cheat guard) | Implemented (2 tests) |
| Control Center 4 profiles + 17 perms | Implemented (2 tests) |
| Connectors (Gmail/Calendar/Drive/OBS/Twitch/Kick/YT/Discord/Notion/Slack) | Real OAuth PKCE + API, needs creds |
| MCP (SSE/Streamable/Stdio) | Implemented (3 tests) |
| Streaming live adapters | Implemented (3 tests), needs live Twitch/YT |
| Game detection FSM | Implemented (5 tests) |
| Workflow Studio (Teach→runtime, 3 editors, FFmpeg) | Implemented (2 tests) |
| Agents (8 roles, tool registry) | Implemented |
| Installer (NSIS+MSI, signed vs unsigned) | Configured, needs Windows build |
| Tests | 152 passing (preview), Windows native TBD |

Codex: configure creds, run native smoke tests, fix platform-specific defects, prepare signed release.
