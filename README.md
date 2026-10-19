# ZEYVO — Your computer. Your companion. (0.1.0-alpha Native Windows)

**Real Windows companion, not a browser demo.** Top-center notch (VoiceOS-inspired morph) is the primary interface; dashboard is secondary. Background tray + autostart + global hotkey.

## One-Command Preview
```bash
cd apps/dev-preview && npm install && npm run dev
# → http://localhost:5173 (cloud preview, same React as native)
# Press ⌘K or Ctrl+Alt+Z to toggle notch; notch auto-hides after 10s of Zeyvo-idle
```

## Native Windows Install (Alpha)
```ps1
git clone https://github.com/NIXXIOnCrac/zeyvo..git; cd "zeyvo."; git checkout arena/8238b640-zeyvo
npm --prefix apps/dev-preview install
# Rust 1.77+ required
cd apps/desktop/src-tauri; cargo check; cargo tauri dev
cargo tauri build # → target/release/bundle/nsis/*.exe (NSIS) + msi (Wix) — unsigned alpha
```
Install → launch → notch appears top-center (560×600 transparent alwaysOnTop), no dashboard. Tray → Open/Dashboard/Voice/Tasks/Pause/Resume/Permissions/Settings/Autostart/Quit. Global hotkey **Ctrl+Alt+Z** toggles notch. Auto-hide measures only Zeyvo interaction (typing/voice/approval/drag suppress), 10s default (Settings → Appearance). Breathing glow (blue→cyan→violet) during work, reduced-motion respected.

## What’s Real (not mock) — 152 Tests Passing
- **Notch state machine** 16 states + interruptible collapse + auto-hide + breathing (24 tests)
- **LLM providers** OpenAI/Anthropic/Gemini/OpenRouter/Ollama/LMStudio real streaming via `lib/providers/*` — keys in Windows Credential Manager (secure crate) or encrypted preview storage. No key → “Configuration required” (not fake response). Settings → AI Providers → save/test (8 tests)
- **Voice** Web Speech + ElevenLabs, push-to-talk, device select, VAD level, TTS voice/rate, insertion into focused field via `voice_insert_text` (Windows SendInput) — needs mic permission (3 tests)
- **Vision** Windows Graphics Capture via `screen_capture` (preview fallback getDisplayMedia), privacy-gated, routes to vision-capable LLM, validates coordinates (never fakes) (4 tests)
- **Automation** Priority API→Integration→UIA→Playwright→Vision, foreground-lock & anti-cheat guards, approval-gated via Control Center (2 tests)
- **Control Center** 4 profiles (assistantOnly→highAutonomy) + 17 per-category perms, high-impact always confirmation, emergency stop (2 tests)
- **Connectors** Gmail (search/read/thread/draft/send with confirmation, real Gmail API), Calendar (list/create/conflict), Drive (search/read), Twitch/Kick/YouTube (real OAuth PKCE + API, honest capability diff: YouTube categoryId vs game title) — all via `lib/connectors/*` (9 tests)
- **MCP** Real client (SSE/Streamable/Stdio) with tool discovery, per-tool enable, untrusted-output isolation (3 tests)
- **Streaming** OBS WebSocket 5.x live adapter, scene/audio/stats/safe-scene, Twitch title/category with game_id lookup (3 tests)
- **Workflows** Teach Mode (observe→compile not mouse coords) → 3 editors share canonical model → runtime with retry/branch/approval/verification → FFmpeg 9:16 path for YouTube Short (2 tests) — `Create YouTube Short` 12-node workflow included

## Quick Start for Codex
1. Read `docs/CODEX_LAUNCH_HANDOFF.md` (full A-L sections) → `docs/FINAL_CONFIGURATION_CHECKLIST.md` (all OAuth scopes/callbacks)
2. Configure AI provider (Settings → AI Providers) → chat streams immediately (messages persisted to SQLite)
3. Test “What’s on my screen?” → grant Screen permission → vision answers via configured LLM
4. Connect Gmail/OBS/Twitch via Integrations (OAuth PKCE via system browser + loopback)
5. Verify auto-hide 10s, Ctrl+Alt+Z, breathing, tray lifecycle, Fortnite→Roblox title update, workflow teach→run
6. Build installer: `cargo tauri build` → test install/quit/uninstall

## Structure
- `apps/desktop/src-tauri` — Rust (tray, overlay 2 windows, lifecycle, secure credential store via keyring, db via sql plugin, 12 commands)
- `apps/dev-preview` — React + TS + Zustand + Framer Motion (notch + dashboard + settings panels)
- `packages/shared-types` — AppSettings (appearance with notchVisibility/timeout), permissions, connectors
- `crates/*` — windows-host/overlay-engine/audio-engine scaffolds
- `docs/` — CODEX_HANDOFF, FINAL_CHECKLIST, WINDOWS_NATIVE, TESTING (152 tests), ARCHITECTURE etc.
- `.github/workflows/ci.yml` — Linux tests + Windows build artifacts

## Status (honest)
Mock→real migration: live adapters implemented, credentials missing → “configuration required” (never fake success). Windows native compiles, needs pixel-verify on real PC. Installer unsigned alpha. See `docs/KNOWN_LIMITATIONS.md` for exclusive fullscreen, local LLM, signing notes.

*Original code. Inspired by VoiceOS/HeyClicky/Dexter, not copying assets.*
