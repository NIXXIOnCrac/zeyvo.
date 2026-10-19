# ZEYVO Architecture

## Foundation
- **Desktop:** Tauri 2 (Rust backend, React frontend)
- **Frontend:** React 18 + TypeScript + Tailwind + Framer Motion + Zustand
- **Native:** Win32, Windows UI Automation, Windows Graphics Capture, .NET where beneficial
- **DB:** SQLite (app data), Windows Protected Storage (tokens)
- **Streaming:** OBS WebSocket 5.x
- **Automation:** Playwright
- **Media:** FFmpeg
- **AI:** Configurable adapters (cloud + local fallback)

## Layout
```
zeyvo/
  apps/desktop/           # Tauri app (src-tauri Rust)
  apps/dev-preview/       # Vite cloud preview (same components)
  crates/windows-host     # Win32 integrations
  crates/overlay-engine   # Transparent topmost notch
  crates/audio-engine     # Mic/speaker routing
  packages/shared-types   # Canonical TS types
  packages/state          # Zustand stores
  packages/*-adapter      # OBS/Twitch/Kick/YouTube mocks → real
  tests/
  docs/
```

## Core Modules
- **Notch State Machine:** 16 states, interruptible transitions, Framer spring
- **Voice Engine:** adapter interface (local STT, cloud STT, ElevenLabs TTS)
- **Screen Intelligence:** permission-scoped capture, UIA tree, annotation
- **Computer Control:** priority API → UIA → Playwright → screenshot grounding
- **Agent Orchestration:** Intent Router → Context → Planner → Tool Registry → Executor → Verifier → Task Manager → Memory → Logger
- **Stream Studio:** OBS + platforms + game detection + privacy + workflows unified
- **Workflow Runtime:** validated JSON schemas, versioned, variable substitution, verification, dry-run
- **Creator Style Memory:** editable profile, platform overrides, learns from edits/rejects

## Background Runtime
- **Three task types:** background API (no focus needed), foreground computer-use (requires focus), cloud agent (if configured)
- **Lifecycle:** startup, idle, lock/unlock, sleep/resume, display change, network loss, OBS/mic disconnect, shutdown
- **Rules:** no desktop control over locked session, no interference with gameplay, persisting recoverable state

## Notch Lifecycle
Hidden → Idle → Hovered → Listening → Transcribing → Thinking → Speaking → Expanding → Expanded → ActionInProgress → ApprovalRequested → Success/Warning/Error → Collapsing → Collapsed → (interruptible)

## Security
Central permission engine: description, scope, input validation, side-effect classification, auth, logging, cancellation. Prompt-injection defenses, trusted vs untrusted input separation (Twitch chat never gains computer control).

## Performance
- Lightweight: minimal observation, reduced animations, cloud AI optional
- Balanced: normal monitoring (default)
- Advanced: frequent monitoring, local inference
- Tracked: idle CPU <2%, idle RAM <150MB, startup <500ms, overlay <16ms frame

