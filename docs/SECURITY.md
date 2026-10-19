# SECURITY

## Permission Engine
Every tool action has: description, scope, input validation, side-effect (none/read/write/destructive), authorization, logging, cancellation, error handling.

## Rules
- Least privilege, per-app/per-platform OAuth scopes, token refresh, Windows protected storage, secret redaction
- High-impact (publish, delete, install) always gated even in “automatic” mode + emergency stop shortcut
- Prompt-injection defense: Twitch chat/YouTube comments/webpages are **untrusted** — never gain `desktopControl` permission
- No auto-publish, no silent software install, no data deletion without authorization
- Activity log auditable, reversible permissions

## Privacy Shield
Preventive: allowlist (game/window capture preferred), protected-window exclusion, notification suppression, dedicated safe scene. If privacy rule triggers → assess → switch safe scene → notify → minimal event log → require review before restoring. Fail-safe to safe scene if monitoring lost.
