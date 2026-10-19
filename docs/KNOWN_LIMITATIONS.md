# KNOWN_LIMITATIONS (Truthful)
- Exclusive fullscreen DirectX cannot be overlaid — requires auto-hide to tray
- Wake-word continuous listening must be opt-in with consent, not default
- Screen capture requires Windows Graphics Capture + user permission (fails gracefully)
- Computer control cannot inject into anti-cheat games
- Local LLM needs GPU check — fallback to cloud if insufficient
- Installer unsigned in dev (distinguish from signed release, no Defender disabling)
- Live OBS/platforms need real credentials — mock-tested only in cloud
- FFmpeg must be installed separately (`winget install FFmpeg`)
- Adobe Premiere integration research suggests ExtendScript/CEP — FFmpeg path remains viable fallback
