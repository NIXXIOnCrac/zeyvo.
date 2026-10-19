# ZEYVO Windows installer build (run on Windows PC after handoff)
param([string]$Config = "release")
Write-Host "Building Zeyvo installer..."
Set-Location $PSScriptRoot/../apps/desktop/src-tauri
cargo build --release
npx tauri build --config tauri.conf.json
Write-Host "Installer at target/release/bundle/"
Write-Host "Unsigned dev build — signing requires cert thumbprint in tauri.conf.json"
