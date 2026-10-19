# AGENTS — Zeyvo Development Guide for AI Contributors

This file instructs AI coding agents (Arena, Codex, Claude) working in this repo.

## Project Context
Zeyvo is a **real Windows Tauri app** (not web), notch is primary UX, dashboard secondary. Cloud-first: mock adapters in preview, real Win32 verification on handoff.

## Roles Orchestration
When subagents available, delegate:
- Windows Engineer → `crates/windows-host`, `apps/desktop/src-tauri`
- Overlay Engineer → `overlay-engine`, `Notch.tsx`, `notchMachine.ts`
- Voice Engineer → `voice-engine`, `mockAdapters.ts` voice section
- Streaming Engineer → `obs-adapter`, `*_adapter`, Live Studio
- Workflow Engineer → `workflow-runtime`, Workflow Studio editors
- Security Engineer → `permissions/`, Privacy Shield
- QA → `tests/` (maintain 100+ tests)

If no subagents, run sequential workflow.

## Conventions
- **State machine first:** All notch changes via `notchMachine.ts` + `dispatch()` — never set state ad-hoc
- **Mock → Real:** Cloud uses `mockAdapters.ts`; Windows replaces with `tauri invoke` (same interface)
- **Permissions:** Every tool needs description, scope, validation, side-effect, auth, logging
- **No fake success:** Mark feature `mock-tested` not `live-verified` until Windows test
- **No secrets in git:** Use Windows protected store, never commit tokens

## Making Changes
1. Inspect `docs/ARCHITECTURE.md` + `REFERENCE_RESEARCH.md`
2. Run `cd apps/dev-preview && npx vitest run` before push
3. Update `docs/DEVELOPMENT_PROGRESS.md` + `FEATURE_MATRIX.md`
4. Test notch interrupt: collapse then click mid-animation → must reopen smoothly

## Handoff
On Windows PC, run `docs/WINDOWS_HANDOFF.md` checklist. Do not rewrite from scratch.

## Do Not
- Replace notch with chat window
- Fake element coordinates or live integration
- Auto-enable wake-word without consent
- Control games/anti-cheat processes
- Publish content without approval

