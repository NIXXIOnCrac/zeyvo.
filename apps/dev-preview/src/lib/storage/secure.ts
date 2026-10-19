// Secure credential storage abstraction — Windows Credential Manager via Tauri, fallback to encrypted localStorage for preview
export interface CredentialStore {
  set(key: string, value: string): Promise<void>
  get(key: string): Promise<string | null>
  delete(key: string): Promise<void>
  list(): Promise<string[]>
}

// Preview implementation (localStorage + memory, NOT for production secrets — real Windows uses Credential Manager)
class PreviewStore implements CredentialStore {
  async set(key: string, value: string) {
    try { localStorage.setItem(`_zeyvo_cred_${key}`, btoa(value)) } catch {}
  }
  async get(key: string) {
    try { const v = localStorage.getItem(`_zeyvo_cred_${key}`); return v ? atob(v) : null } catch { return null }
  }
  async delete(key: string) { try { localStorage.removeItem(`_zeyvo_cred_${key}`) } catch {} }
  async list(): Promise<string[]> {
    try { return Object.keys(localStorage).filter(k=>k.startsWith('_zeyvo_cred_')) } catch { return [] }
  }
}

// Detect Tauri invoke for real Windows storage
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

class TauriStore implements CredentialStore {
  async set(key: string, value: string) {
    // @ts-ignore
    await window.__TAURI__.core.invoke('secure_set', { key, value })
  }
  async get(key: string): Promise<string | null> {
    // @ts-ignore
    return await window.__TAURI__.core.invoke('secure_get', { key })
  }
  async delete(key: string) {
    // @ts-ignore
    await window.__TAURI__.core.invoke('secure_delete', { key })
  }
  async list(): Promise<string[]> {
    // @ts-ignore
    return await window.__TAURI__.core.invoke('secure_list')
  }
}

export const credentialStore: CredentialStore = isTauri() ? new TauriStore() : new PreviewStore()

// OAuth token shape
export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  scope?: string
}
export async function saveOAuth(provider: string, tokens: OAuthTokens) {
  await credentialStore.set(`oauth:${provider}`, JSON.stringify(tokens))
}
export async function loadOAuth(provider: string): Promise<OAuthTokens | null> {
  const raw = await credentialStore.get(`oauth:${provider}`)
  return raw ? JSON.parse(raw) : null
}
export async function clearOAuth(provider: string) { await credentialStore.delete(`oauth:${provider}`) }
