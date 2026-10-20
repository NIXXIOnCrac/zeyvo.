# ZEYVO — Mac Classic Notch Demo

**This is a small, offline prototype for macOS, not the full ZEYVO app built with Codex.** It is a Python/Qt launcher package, **not** a signed or notarized Mac .app or .dmg.

## Download for MacBook

[**Download ZEYVO Classic Notch for Mac (ZIP)**](https://github.com/NIXXIOnCrac/zeyvo./raw/refs/heads/mac-notch-preview/downloads/ZEYVO-Classic-Notch-macOS.zip)

## How to try it

1. Download the ZIP and extract it on your MacBook.
2. Install Python 3.10 or newer from the official python.org site if it is not installed.
3. Open the extracted **ZEYVO-Classic-Notch** folder.
4. Start the launcher **Run-on-Mac.command**. It opens a Terminal window and installs PySide6 into its own local virtual environment on the first run (internet required).
5. If macOS doesn't launch the command by double-clicking, open Terminal, enter `bash `, drag **Run-on-Mac.command** into the Terminal window, and press Return.
6. Look for the small black ZEYVO notch at the top of the desktop. Click it to ask *How are you?*, *What time is it?*, or *Tell me a joke?*
7. After 30 seconds without ZEYVO interaction it shrinks to a tiny bump. Hover over it to bring it back.

The window respects the Mac menu bar's usable display area and therefore may be slightly below the physical top edge. It does not request screen recording, microphone, or personal file access.

Do not disable Gatekeeper or Mac security settings. Only run downloaded software you trust.

**Limitations:** Predefined offline replies; no voice control, no opening Chrome, no OBS integration, no AI account/login. The complete ZEYVO Windows application is still a separate Codex project.

**Maintainer note:** Kept on an isolated branch so the actual ZEYVO main repository remains untouched. This prototype is not a shipping release.
