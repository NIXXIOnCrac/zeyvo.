import type { ProviderAdapter, ChatRequest, ChatChunk, ProviderConfig } from './types'

export class AnthropicAdapter implements ProviderAdapter {
  id = 'anthropic' as const
  name = 'Anthropic'
  capabilities: ProviderAdapter['capabilities'] = ['chat','stream','tools','vision']
  constructor(private cfg: ProviderConfig, private getKey:()=>Promise<string|null>) {}
  private base(){ return (this.cfg.endpoint||'https://api.anthropic.com/v1').replace(/\/$/,'') }

  async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatChunk> {
    const key = await this.getKey()
    if (!key) throw new Error('Anthropic key missing — Settings → AI Providers')
    // Anthropic requires system separate
    const system = req.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n')
    const messages = req.messages.filter(m=>m.role!=='system').map(m=>({ role:m.role, content:m.content }))
    const res = await fetch(`${this.base()}/messages`, {
      method:'POST', signal,
      headers:{ 'Content-Type':'application/json', 'x-api-key': key, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:req.model||this.cfg.model||'claude-3-5-sonnet-latest', max_tokens: req.maxTokens||1024, system: system||undefined, messages })
    })
    if(!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
    const j=await res.json()
    return { delta: j.content?.[0]?.text||'', done:true, usage: { promptTokens: j.usage?.input_tokens||0, completionTokens: j.usage?.output_tokens||0, totalTokens:(j.usage?.input_tokens||0)+(j.usage?.output_tokens||0) } }
  }

  async chatStream(req: ChatRequest, onChunk:(c:ChatChunk)=>void, signal?: AbortSignal): Promise<ChatChunk> {
    // Fallback to non-stream (Anthropic streaming is SSE)
    const r = await this.chat(req, signal)
    onChunk({ delta: r.delta, done:false })
    onChunk({ delta:'', done:true, usage:r.usage })
    return r
  }
  async testConnection(){ const s=Date.now(); try{ const k=await this.getKey(); if(!k) return {ok:false, latencyMs:0, error:'key missing'}; return { ok:true, latencyMs: Date.now()-s, models:['claude-3-5-sonnet-latest','claude-3-opus-latest'] } }catch(e:any){ return { ok:false, latencyMs: Date.now()-s, error:e.message }}}
  async listModels(){ return ['claude-3-5-sonnet-latest','claude-3-haiku-latest','claude-3-opus-latest'] }
}
