# Final Configuration Checklist — External Services Requiring User Action

| Provider | Dev Account Setup | Credentials Required | OAuth | Scopes | Callback | Connection Test | Verification | Limitations |
|----------|------------------|----------------------|-------|--------|----------|-----------------|--------------|-------------|
| **OpenAI** | platform.openai.com → API keys | API key | No (key) | n/a | n/a | Settings → AI Providers → Test → shows models | Chat streams, vision via gpt-4o | Pay-per-token, rate limits |
| **Anthropic** | console.anthropic.com | API key | No | n/a | n/a | Test | Chat | No vision in some models |
| **Gemini** | aistudio.google.com | API key | No | n/a | n/a | Test | Chat + vision | Quota |
| **OpenRouter** | openrouter.ai | API key | No | n/a | n/a | Test | Unified models | Varies by model |
| **Ollama** | ollama.ai → `ollama serve` | None (local) | No | n/a | http://localhost:11434 | Test local → lists models | Local inference, needs `ollama pull llama3.1` | GPU-dependent, slower |
| **Gmail** | console.cloud.google.com → enable Gmail API → OAuth app | Client ID | PKCE | gmail.readonly, gmail.send | http://localhost:5173/oauth/callback | Integrations → Gmail → Connect → search inbox | `gmailClient.search` live | Sending requires approval UI |
| **Google Calendar** | Same project, enable Calendar API | Client ID | PKCE | calendar | same | Connect → list events | `calendarClient.listEvents` | Timezone handling |
| **Google Drive** | Enable Drive API | Client ID | PKCE | drive.file, drive.readonly | same | Connect → search files | `driveClient.search` | No recursive scan without approval |
| **Twitch** | dev.twitch.tv → app | Client ID | PKCE | channel:manage:broadcast, chat:read | http://localhost:5173/oauth/callback | Live Studio → Connect | updateTitle/category (needs game_id) | Game lookup required |
| **Kick** | kick.com API docs (limited) | Client ID? | OAuth | n/a | same | Test shows limited | Title/category may be manual | API unstable — document honestly |
| **YouTube** | console.cloud.google.com → enable YouTube Data API v3 | Client ID | PKCE | youtube (or youtubepartner) | same | Connect → live status | updateTitle works; updateCategory numeric only (video category vs game title distinction) | Game title not same as categoryId |
| **OBS** | OBS → Tools → WebSocket Settings | URL + password (ws://localhost:4455) | No | n/a | n/a | Live Studio → Connect → scenes | switchScene, audio, stats | Requires OBS running |
| **Discord** | discord.com/developers | Client ID | OAuth | bot/identify | same | Connect | Official API only | No user-token scraping |
| **Notion** | notion.so → integrations | Client ID | OAuth | n/a | same | Connect | Read/write pages | Rate limited |
| **MCP** | Your MCP server | URL (SSE/Streamable) or command | Varies | n/a | n/a | Integrations → Add MCP → Connect → tools/list | `mcpClient.connect` | Stdio needs Windows native; outputs untrusted |

**Never commit secrets.** All keys/tokens go via `secure` crate (Windows Credential Manager) or `credentialStore` (preview encrypted localStorage). Revoke via Disconnect.
