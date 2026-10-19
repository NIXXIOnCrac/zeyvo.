# WINDOWS_HANDOFF — Finish on Real PC

## Prerequisites
- Windows 11 (10 supported), Rust 1.77+, Node 20+, Visual Studio Build Tools
- OBS Studio with WebSocket 5.x enabled (Tools → WebSocket Server)
- Twitch Developer App + YouTube OAuth credentials (optional, can skip)

## Steps
1. **Clone & install**
   ```ps1
   git clone https://github.com/NIXXIOnCrac/zeyvo..git
   cd "zeyvo."
   git checkout arena/8238b640-zeyvo
   npm install
   npm --prefix apps/dev-preview install
   ```

2. **Verify Rust build**
   ```ps1
   cd apps/desktop/src-tauri
   cargo check   # should pass (Tauri 2 + Win32 deps)
   cargo build --release
   ```

3. **Run native preview**
   ```ps1
   npm run tauri dev
   # Check: tray icon appears, click shows app, quit works
   # Notch: transparent overlay at top-center, topmost, click-through when collapsed, hover glow, ⌘K toggles, Esc collapses, no focus steal, DPI/multi-monitor correct
   # Test fullscreen game: notch should auto-hide or stay topmost per setting, must not capture in OBS if exclusion enabled
   ```

4. **Live OBS test**
   - Enable WebSocket, set password, connect from Live Studio → verify scenes, audio levels, scene switching, streaming/recording status

5. **Platform OAuth**
   - Authorize Twitch/YouTube via Integrations tab → verify title/category update with real API, test askThenAct vs automatic

6. **Game detection**
   - Launch Fortnite → close → launch Roblox → verify dashboard shows transition, title card appears per policy, confirm updates Twitch

7. **Workflow**
   - Run “Create YouTube Short” with sample video → verify FFmpeg 9:16 crop + captions (install FFmpeg: `winget install FFmpeg`)
   - Teach Mode: “Watch me do this” with Notepad → compile → verify versioned JSON

8. **Installer**
   ```ps1
   npm run tauri build  # produces src-tauri/target/release/bundle/nsis/*.exe or msi
   # Install, test: launch, notch, tray, autostart toggle, uninstall
   ```

## What Requires Windows Only
- Real tray (Win32), overlay transparency/topmost/click-through
- Global hotkeys, Win Graphics Capture permission prompt, UIA automation
- Game process enumeration, audio device routing
- Windows Hello credential store

## Transition Cleanliness
Do NOT rewrite app. Same React components run in both Vite preview and Tauri webview. Only swap mockAdapters for tauri invoke calls in `useZeyvoStore.ts`.

## Troubleshooting
- **Build fails:** Install `windows-sdk`, restart
- **Overlay not topmost:** Check Windows focus-assist, exclusive fullscreen limitations documented
- **OBS not connecting:** Verify port 4455, firewall

