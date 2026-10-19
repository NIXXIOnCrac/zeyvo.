# ZEYVO — Reference Research

## VoiceOS — Primary UI Reference
**Site:** https://www.voiceos.com/
**Findings:**
- Top-center black pill notch flush to screen edge (3-4px thickness, 220-280px collapsed)
- Expands downward via morphing animation (spring 380/28), not separate dialog
- Interactive cards: calendar, email, task approvals inside expanded panel
- Completion notifications compact (success/warning/error)
- Listening waveform (14 bars), thinking dots, speaking state
- Interruptible collapse: activation during collapse reopens smoothly
- Must support reduced-motion, multi-monitor, DPI scaling, fullscreen auto-hide, OBS capture exclusion
- **Implementation:** Framer Motion layout animation, state machine with 16 states, click-through overlay via Tauri transparent window

## HeyClicky
**Site:** https://www.heyclicky.com/
**Features researched:**
- Screen understanding: OCR + DOM + screenshot grounding
- Pointing: highlight, arrow, circle UI elements
- Guidance: step-by-step overlays
- Voice conversations: natural turn-taking
- Computer-use: API → UIA → browser automation → screenshot grounding priority
- **Reusable:** Architecture patterns, not code — original implementation required

## Original Clicky (Open Source)
**Repo:** https://github.com/farzaa/clicky
**License:** MIT
**Findings:** Electron + vision models, reusable pointing concepts, needs Windows Win32 adaptation

## Windows Clicky Implementation
**Repo:** https://github.com/unn-Known1/clickyX
**Findings:** Windows compatibility via Win32, UIA, Graphics Capture. Architecture uses Rust native host + React overlay — validated approach for Zeyvo

## Dexter AI — Streaming Reference
**Sites:** https://www.dexterai.org/ , https://www.dexterai.org/early-access
**Advertised capabilities:**
- Verified: OBS setup guidance, scene templates, audio checks, pre-stream checklist, chat overlays
- Verified: Twitch/YouTube integrations (OAuth, title/category updates where API allows)
- Marketing claims (unverified): “fully autonomous stream management” — treat as aspirational, implement with approval policies
- **Feature matrix:** All capabilities mapped to approval modes (askThenAct/actAndNotify/automatic) with high-impact safeguards

## REA — Reverse Engineer Anything
**Repo:** https://github.com/morluto/rea
**Status:** Local Windows skill, not available in Arena cloud — checked environment, no access. Use only authorized REA investigations when docs insufficient. No DRM bypass.

## Architecture Recommendations
- **Tauri 2** over Electron for <120MB idle RAM, startup <500ms, native overlay
- **SQLite** via tauri-plugin-sql for local storage
- **Windows credential storage** for tokens (not SQLite)
- **OBS WebSocket 5.x** official
- **Playwright** for browser automation
- **Framer Motion** for interruptible morph
- **Zustand** for state (lightweight, no microservices)

## Licensing
- All new code: MIT
- Clicky original: MIT (reuse with attribution)
- No copying of VoiceOS/Dexter proprietary assets — original glassmorphism design (smoked glass, electric blue #0a84ff)

## Technical Limitations
- Exclusive fullscreen (DirectX exclusive) cannot overlay — requires auto-hide + tray fallback
- Continuous wake-word listening requires explicit consent, not default
- Local model inference needs hardware detection (Lightweight/Balanced/Advanced modes)
- Twitch/Kick/YouTube capability parity differs — honest capability detection
