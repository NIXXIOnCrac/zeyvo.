import type { ProviderConfig, ProviderAdapter, ChatRequest, ChatChunk } from './types'
import { OpenAIAdapter } from './openai'
import { AnthropicAdapter } from './anthropic'
import { GeminiAdapter } from './gemini'
import { OpenRouterAdapter } from './openrouter'
import { OllamaAdapter } from './ollama'
import { credentialStore } from '../storage/secure'

export class ProviderRouter {
  private configs: Map<string, ProviderConfig> = new Map()
  private activeId: string | null = null

  constructor(initial?: ProviderConfig[]) {
    if (initial) initial.forEach(c=>this.configs.set(c.id, c))
    this.loadFromStorage()
  }

  private async loadFromStorage() {
    try {
      const raw = localStorage.getItem('zeyvo_providers')
      if (raw) {
        const arr: ProviderConfig[] = JSON.parse(raw)
        arr.forEach(c=>this.configs.set(c.id, c))
        const active = localStorage.getItem('zeyvo_active_provider')
        if (active) this.activeId = active
      }
    } catch {}
  }

  save() {
    localStorage.setItem('zeyvo_providers', JSON.stringify([...this.configs.values()]))
    if (this.activeId) localStorage.setItem('zeyvo_active_provider', this.activeId)
  }

  setConfig(c: ProviderConfig) { this.configs.set(c.id, c); this.save() }
  getConfig(id: string): ProviderConfig | undefined { return this.configs.get(id) }
  listConfigs(): ProviderConfig[] { return [...this.configs.values()] }
  setActive(id: string | null) { this.activeId = id; this.save() }
  getActive(): ProviderConfig | null { return this.activeId ? this.configs.get(this.activeId) || null : null }

  private getKey = async (id: string): Promise<string|null> => {
    // try secure store first
    const k = await credentialStore.get(`provider:${id}`)
    if (k) return k
    // fallback to config (for preview)
    return this.configs.get(id)?.apiKey || null
  }

  getAdapter(id?: string): ProviderAdapter | null {
    const cfg = id ? this.configs.get(id) : this.getActive()
    if (!cfg || !cfg.enabled) return null
    const getKey = () => this.getKey(cfg.id)
    switch (cfg.id) {
      case 'openai': return new OpenAIAdapter(cfg, getKey)
      case 'anthropic': return new AnthropicAdapter(cfg, getKey)
      case 'gemini': return new GeminiAdapter(cfg, getKey)
      case 'openrouter': return new OpenRouterAdapter(cfg, getKey)
      case 'ollama': return new OllamaAdapter(cfg)
      case 'lmstudio': return new OllamaAdapter({ ...cfg, endpoint: cfg.endpoint||'http://localhost:1234/v1' })
      case 'mock': return new MockAdapter()
      default: return null
    }
  }

  async chat(req: ChatRequest, onChunk?: (c:ChatChunk)=>void, signal?: AbortSignal): Promise<ChatChunk> {
    const adapter = this.getAdapter()
    if (!adapter) {
      // No credentials — clear configuration-required state
      throw new Error('Configuration required: No AI provider configured. Go to Settings → AI Providers and add an API key (OpenAI, Anthropic, Gemini, Ollama, etc.).')
    }
    if (onChunk && adapter.capabilities.includes('stream')) {
      return await adapter.chatStream(req, onChunk, signal)
    }
    const res = await adapter.chat(req, signal)
    if (onChunk) onChunk(res)
    return res
  }

  async test(id: string) {
    const a = this.getAdapter(id)
    if (!a) return { ok:false, error:'Provider not configured' }
    return await a.testConnection()
  }
}

class MockAdapter implements ProviderAdapter {
  id='mock' as const; name='Mock (dev)'; capabilities:ProviderAdapter['capabilities']=['chat','stream']
  async chat(req:ChatRequest):Promise<ChatChunk>{
    const last = req.messages[req.messages.length-1]?.content||''
    // deterministic mock that shows it's mock (not fake success)
    const msg = `[Mock] You said: "${last.slice(0,80)}" — configure a real provider in Settings → AI Providers to get live AI. Mock preserves conversation history (${req.messages.length} msgs).`
    return { delta: msg, done:true }
  }
  async chatStream(req:ChatRequest, onChunk:(c:ChatChunk)=>void):Promise<ChatChunk>{
    const r=await this.chat(req)
    // simulate streaming
    for (const w of r.delta.split(' ')) { onChunk({delta:w+' ',done:false}); await new Promise(r=>setTimeout(r,15)) }
    onChunk({delta:'',done:true}); return r
  }
  async testConnection(){ return { ok:true, latencyMs: 5, models:['mock-gpt'] }}
  async listModels(){ return ['mock-gpt'] }
}

export const router = new ProviderRouter([
  { id:'mock', name:'Mock (dev)', model:'mock-gpt', enabled:true, streaming:true, timeoutMs: 10000 } as any
])
