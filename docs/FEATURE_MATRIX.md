# Feature Matrix — Verified vs Claims

| Feature | Status | Verified |
|---------|--------|----------|
| Notch 16 states + interruptible morph | Implemented (Framer) | ✅ mock-tested 10 tests |
| Tray + autostart + lifecycle (11 events) | Implemented (Rust stub) | mock-tested, needs Windows |
| Voice (dictation/edit/conversation/agent/stream/teach) | Adapter interface + mock | mock-tested |
| Screen intelligence (capture/point/draw) | Permission-scoped UI + mock | mock-tested |
| Computer control (API → UIA → Playwright → screenshot) | Priority engine | design complete |
| OBS WebSocket (connect, scenes, audio, stats) | Mock adapter | mock-tested 7 tests |
| Twitch/Kick/YouTube (OAuth, title/category) | Mock platforms | mock-tested |
| Game detection (Fortnite→Roblox, Discord debounce) | FSM with stability timers | mock-tested 5 tests |
| Creator Style Memory | Profile + generation | mock-tested |
| Approval modes (3 granular) | Policy engine | mock-tested 5 tests |
| Privacy Shield (allowlist + safe scene) | Preventive architecture | mock-tested |
| Workflow Studio (Teach → compile → Simple/Visual/JSON) | Mock runtime | mock-tested |
| Create YouTube Short (12-node workflow) | FFmpeg path | Implemented |
| Stream Autopilot (monitor + auto-update) | Event triggers | Implemented |
| AI Co-host (private/co-host/silent) | Routing logic | Implemented |
| Memory (8 categories) | Store + controls | Implemented |
| Installer (.exe/.msi) | Tauri bundler config | Blocked — needs Windows build |

Legend: Planned → In development → Implemented → Mock-tested → Windows-tested → Live verified → Verified complete
